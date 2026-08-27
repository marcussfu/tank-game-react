import {
    BOOM_DURATION_TICKS,
    GAME_OVER_DELAY_TICKS,
    SIM_TICK_MS,
    TANK_MOVE_TICKS,
    TIME_LIMIT_SEC,
    TREASURE_REVEAL_TICKS,
    gridCellsToPositions,
} from './constants';
import { LEVELS } from './maps/registry';
import { setupTiles } from './map/mapLoader';
import { getCurrentPosition } from './systems/movement.system';
import { inBounds, isImpassable, isOccupiedByTank, tileAt, toGridCell } from './systems/collision.system';
import { tickEnemyTank } from './systems/ai.system';
import { checkBulletAtSpawn, createBullet, tickBullet } from './systems/bullets.system';
import type { BulletTickOutcome } from './systems/bullets.system';
import { getSpawnWave, shouldSpawnWave } from './systems/spawn.system';
import { isAllTanksCleared, isShortOfTime, isTimeExpired, resolveEagleHit } from './systems/win-lose.system';
import { EngineEventBus } from './events';
import type { EngineEvent, EngineEventListener } from './events';
import type {
    BulletEntity,
    Direction,
    EngineSnapshot,
    GameStatus,
    LevelDefinition,
    PlayerEntity,
    Position,
    TankEntity,
    TileGrid,
} from './types';

const TICKS_PER_SECOND = 1000 / SIM_TICK_MS;

interface DelayedAction {
    atTick: number;
    run: () => void;
}

const makeInitialPlayer = (level: LevelDefinition): PlayerEntity => ({
    position: level.playerStart.position,
    direction: level.playerStart.direction,
    hidden: false,
    inputDirection: '',
    moveTickAccumulator: 0,
});

/**
 * Pure-TS, zero React/Redux game engine. Owns every per-frame entity (tiles,
 * tanks, bullets, player) and advances them one fixed-timestep sim tick at a
 * time via `tick()`. The caller (render/CanvasStage.tsx, in M2) is
 * responsible for calling `tick()` at a steady SIM_TICK_MS cadence via an
 * accumulator — the engine itself has no timers.
 *
 * `pause()` simply stops `tick()` from doing anything; since every piece of
 * state (including delayed actions like the eagle-hit->gameOver countdown)
 * lives here rather than in unmounted React component state, resuming is
 * exact — this is what structurally fixes the DOM version's bugs #6/#7
 * (tank state lost on pause-triggered unmount, queued input firing the
 * instant a pause lifts).
 */
export class Engine {
    private levelIndex = 0;
    private level: LevelDefinition = LEVELS[0];
    private eagleTargetPositions: Position[] = [];
    private tiles: TileGrid;
    private tanks: TankEntity[] = [];
    private bullets: BulletEntity[] = [];
    private player: PlayerEntity;
    private status: GameStatus = 'idle';
    private timeRemainingSec = TIME_LIMIT_SEC;
    private simTick = 0;
    private shortOfTimeEmitted = false;
    private delayedActions: DelayedAction[] = [];
    private tankKeySeq = 0;
    private readonly eventBus = new EngineEventBus();

    constructor() {
        this.tiles = setupTiles(this.level.tiles);
        this.eagleTargetPositions = gridCellsToPositions(this.level.flagPosition);
        this.player = makeInitialPlayer(this.level);
    }

    on(listener: EngineEventListener): () => void {
        return this.eventBus.on(listener);
    }

    private emit(event: EngineEvent): void {
        this.eventBus.emit(event);
    }

    getSnapshot(): EngineSnapshot {
        return {
            status: this.status,
            tiles: this.tiles,
            tanks: this.tanks,
            bullets: this.bullets,
            player: this.player,
            timeRemainingSec: this.timeRemainingSec,
            levelIndex: this.levelIndex,
            totalLevels: LEVELS.length,
        };
    }

    /** Loads a level's map/eagle/spawn data by index — shared by `resetState`
     * for both a fresh game (always index 0) and `advanceLevel` (index + 1). */
    private loadLevel(index: number): void {
        this.levelIndex = index;
        this.level = LEVELS[index];
        this.tiles = setupTiles(this.level.tiles);
        this.eagleTargetPositions = gridCellsToPositions(this.level.flagPosition);
    }

    private resetState(levelIndex: number): void {
        this.loadLevel(levelIndex);
        this.tanks = [];
        this.bullets = [];
        this.player = makeInitialPlayer(this.level);
        this.timeRemainingSec = TIME_LIMIT_SEC;
        this.simTick = 0;
        this.shortOfTimeEmitted = false;
        this.delayedActions = [];
    }

    /** Shared by `start()` and `advanceLevel()` — both begin play on whatever
     * level `resetState()` just loaded. */
    private beginLevel(): void {
        this.status = 'playing';
        this.emit({ type: 'gameStarted' });
        this.emit({ type: 'levelChanged', levelIndex: this.levelIndex, totalLevels: LEVELS.length });
        this.spawnWave();
    }

    /** Starts a fresh game (or restarts after a win/loss) — always from the first level. */
    start(): void {
        this.resetState(0);
        this.beginLevel();
    }

    /** Ports the DOM version's `gameInit()` (GameResult's restart button): back
     * to the menu, not straight back into a new game. */
    returnToMenu(): void {
        this.resetState(0);
        this.status = 'idle';
        this.emit({ type: 'gameReset' });
    }

    /** Moves on from a cleared level to the next one, if any — a no-op unless
     * `status` is `'won'` and a next level exists (callers should check the
     * snapshot's `levelIndex`/`totalLevels` before offering this). */
    advanceLevel(): void {
        if (this.status !== 'won') return;
        const nextIndex = this.levelIndex + 1;
        if (nextIndex >= LEVELS.length) return;
        this.resetState(nextIndex);
        this.beginLevel();
    }

    pause(): void {
        if (this.status !== 'playing') return;
        this.status = 'paused';
        this.emit({ type: 'gamePaused' });
    }

    resume(): void {
        if (this.status !== 'paused') return;
        this.status = 'playing';
        this.emit({ type: 'gameResumed' });
    }

    togglePause(): void {
        if (this.status === 'playing') this.pause();
        else if (this.status === 'paused') this.resume();
    }

    setPlayerInputDirection(dir: Direction | ''): void {
        if (this.status !== 'playing') return;
        if (dir === this.player.inputDirection) return;
        this.player.inputDirection = dir;
        this.player.moveTickAccumulator = 0;
        if (dir !== '') this.movePlayer(dir);
    }

    firePlayerBullet(): void {
        if (this.status !== 'playing' || this.player.direction === '') return;
        const spawnPos = getCurrentPosition(this.player.direction, this.player.position);
        this.fireBullet(spawnPos, this.player.direction, true);
    }

    /** Advances the simulation by exactly one SIM_TICK_MS step. A no-op unless `status === 'playing'`. */
    tick(): void {
        if (this.status !== 'playing') return;
        this.simTick++;

        this.runDueDelayedActions();
        this.tickPlayerMovement();
        this.tickTanks();
        this.tickBullets();
        this.tickClock();
    }

    // ---- spawning ----

    private nextTankKey(): number {
        return Date.now() + this.tankKeySeq++;
    }

    private spawnWave(): void {
        for (const spawn of getSpawnWave(this.level.tankSpawns)) {
            const tank: TankEntity = {
                keyIndex: this.nextTankKey(),
                position: spawn.position,
                direction: spawn.direction,
                fireTick: 0,
                moveTickAccumulator: 0,
            };
            this.tanks.push(tank);
            this.emit({ type: 'tankSpawned', keyIndex: tank.keyIndex, position: tank.position });
        }
    }

    // ---- delayed actions (replaces the DOM version's setTimeout calls) ----

    private scheduleAfterTicks(ticks: number, run: () => void): void {
        this.delayedActions.push({ atTick: this.simTick + ticks, run });
    }

    private runDueDelayedActions(): void {
        if (this.delayedActions.length === 0) return;
        const due = this.delayedActions.filter(a => a.atTick <= this.simTick);
        if (due.length === 0) return;
        this.delayedActions = this.delayedActions.filter(a => a.atTick > this.simTick);
        for (const action of due) action.run();
    }

    // ---- tiles ----

    private setTile(pos: Position, value: number): void {
        const [row, col] = toGridCell(pos);
        this.tiles[row][col] = value;
        this.emit({ type: 'mapChanged' });
    }

    /** Ports `releaseBoom`: shows the explosion sprite, then reverts the cell
     * after BOOM_DURATION_TICKS — back to shelter(1) if that's what was
     * there, otherwise grass(0). */
    private releaseBoom(pos: Position): void {
        const current = tileAt(this.tiles, pos);
        const revertValue = current === 1 ? 1 : 0;
        this.setTile(pos, 9);
        this.scheduleAfterTicks(BOOM_DURATION_TICKS, () => this.setTile(pos, revertValue));
    }

    private hitTreasure(pos: Position): void {
        this.setTile(pos, 9);
        this.scheduleAfterTicks(TREASURE_REVEAL_TICKS, () => this.setTile(pos, 4));
    }

    private destroyEagle(): void {
        for (const { cell, value } of resolveEagleHit(this.level.flagPosition)) {
            this.tiles[cell[0]][cell[1]] = value;
        }
        this.emit({ type: 'mapChanged' });
        this.emit({ type: 'eagleDestroyed' });
        this.scheduleAfterTicks(GAME_OVER_DELAY_TICKS, () => this.loseGame());
    }

    // ---- player ----

    private movePlayer(dir: Direction): void {
        this.player.direction = dir;
        const nextPos = getCurrentPosition(dir, this.player.position);
        if (!inBounds(nextPos)) return;

        const tile = tileAt(this.tiles, nextPos);
        if (tile === 4) {
            this.setTile(nextPos, 0);
            this.player.position = nextPos;
            this.winGame();
            this.emit({ type: 'starCollected' });
            return;
        }
        if (isImpassable(tile)) return;
        if (isOccupiedByTank(this.tanks, nextPos)) return;
        this.player.position = nextPos;
    }

    private tickPlayerMovement(): void {
        if (this.player.inputDirection === '') return;
        this.player.moveTickAccumulator++;
        if (this.player.moveTickAccumulator >= TANK_MOVE_TICKS) {
            this.player.moveTickAccumulator = 0;
            this.movePlayer(this.player.inputDirection);
        }
    }

    private hitPlayer(): void {
        if (this.player.hidden) return;
        this.player.hidden = true;
        this.releaseBoom(this.player.position);
        this.emit({ type: 'playerHit' });
        this.scheduleAfterTicks(GAME_OVER_DELAY_TICKS, () => this.loseGame());
    }

    // ---- tanks ----

    private tickTanks(): void {
        for (const tank of this.tanks) {
            tank.moveTickAccumulator++;
            if (tank.moveTickAccumulator < TANK_MOVE_TICKS) continue;
            tank.moveTickAccumulator = 0;

            const { tank: updated, fired } = tickEnemyTank(
                tank, this.tiles, this.tanks, this.player, this.eagleTargetPositions,
            );
            Object.assign(tank, updated);

            if (fired) {
                const spawnPos = getCurrentPosition(tank.direction, tank.position);
                this.fireBullet(spawnPos, tank.direction, false);
            }
        }
    }

    private destroyTank(keyIndex: number, position: Position): void {
        this.tanks = this.tanks.filter(t => t.keyIndex !== keyIndex);
        this.emit({ type: 'tankDestroyed', keyIndex, position });
        this.releaseBoom(position);
        if (isAllTanksCleared(this.tanks)) this.winGame();
    }

    // ---- bullets ----

    /**
     * Creates a bullet and immediately classifies its spawn cell — matching
     * bullet.component.tsx's mount-time impassability check, which ran
     * before the bullet's first movement tick. Without this, a bullet fired
     * at point-blank range into a wall (or anything else) would spawn
     * embedded in that cell and only ever get classified one cell further
     * on its first tick, silently phasing through whatever it spawned on.
     */
    private fireBullet(position: Position, direction: Direction, isPlayerBullet: boolean): void {
        const bullet = createBullet({ position, direction, isPlayerBullet });
        this.emit({ type: 'bulletFired', keyIndex: bullet.keyIndex, isPlayerBullet });

        const outcome = checkBulletAtSpawn(bullet, this.tiles, this.tanks, this.player);
        if (this.applyBulletOutcome(bullet, outcome)) this.bullets.push(bullet);
    }

    /** Applies a classified outcome to engine state; returns whether the
     * bullet survives (and so belongs back in `this.bullets`). */
    private applyBulletOutcome(bullet: BulletEntity, outcome: BulletTickOutcome): boolean {
        switch (outcome.kind) {
            case 'advance':
                bullet.position = outcome.position;
                return true;
            case 'expired':
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
            case 'hitTank':
                this.destroyTank(outcome.tankKeyIndex, outcome.position);
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
            case 'hitPlayer':
                this.hitPlayer();
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
            case 'hitWall':
                this.releaseBoom(outcome.position);
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
            case 'hitEagle':
                this.destroyEagle();
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
            case 'hitTreasure':
                this.hitTreasure(outcome.position);
                this.emit({ type: 'bulletExpired', keyIndex: bullet.keyIndex });
                return false;
        }
    }

    private tickBullets(): void {
        if (this.bullets.length === 0) return;
        const remaining: BulletEntity[] = [];

        for (const bullet of this.bullets) {
            const outcome = tickBullet(bullet, this.tiles, this.tanks, this.player);
            if (this.applyBulletOutcome(bullet, outcome)) remaining.push(bullet);
        }

        // A win clears every bullet immediately (ports bullet.component.tsx's
        // `removeBullet()` call in the win branch); a loss is always delayed
        // (scheduled via GAME_OVER_DELAY_TICKS) so it never lands mid-loop here.
        this.bullets = this.status === 'won' ? [] : remaining;
    }

    // ---- clock ----

    private tickClock(): void {
        if (this.simTick % TICKS_PER_SECOND !== 0) return;
        this.timeRemainingSec--;
        this.emit({ type: 'timeTick', timeRemainingSec: this.timeRemainingSec });

        if (!this.shortOfTimeEmitted && isShortOfTime(this.timeRemainingSec)) {
            this.shortOfTimeEmitted = true;
            this.emit({ type: 'shortOfTime' });
        }

        if (isTimeExpired(this.timeRemainingSec)) {
            this.loseGame();
            return;
        }

        if (shouldSpawnWave(this.timeRemainingSec)) this.spawnWave();
    }

    // ---- win/lose ----

    private winGame(): void {
        if (this.status !== 'playing') return;
        this.status = 'won';
        this.tanks = [];
        this.emit({ type: 'gameWon' });
    }

    private loseGame(): void {
        if (this.status !== 'playing') return;
        this.status = 'lost';
        this.tanks = [];
        this.bullets = [];
        this.emit({ type: 'gameLost' });
    }
}
