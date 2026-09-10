import {
    BOOM_DURATION_TICKS,
    FREEZE_DURATION_TICKS,
    GAME_OVER_DELAY_TICKS,
    INVINCIBILITY_DURATION_TICKS,
    SCORE_LEVEL_CLEAR,
    SCORE_PER_TANK,
    SCORE_TIME_BONUS_PER_SEC,
    SIM_TICK_MS,
    STARTING_LIVES,
    TANK_MOVE_TICKS,
    TIME_LIMIT_SEC,
    TREASURE_REVEAL_TICKS,
    gridCellsToPositions,
} from './constants';
import { LEVELS } from './maps/registry';
import { setupTiles } from './map/mapLoader';
import { getCurrentPosition } from './systems/movement.system';
import { cellsEqual, inBounds, isImpassable, isOccupiedByPlayers, tileAt, toGridCell } from './systems/collision.system';
import { tickEnemyTank } from './systems/ai.system';
import { checkBulletAtSpawn, createBullet, tickBullet } from './systems/bullets.system';
import type { BulletTickOutcome } from './systems/bullets.system';
import { findRandomPassablePosition, pickPowerupKind, shouldSpawnPowerup } from './systems/powerup.system';
import { getSpawnWave, shouldSpawnWave } from './systems/spawn.system';
import { isAllTanksCleared, isShortOfTime, isTimeExpired, resolveEagleHit } from './systems/win-lose.system';
import { EngineEventBus } from './events';
import type { EngineEvent, EngineEventListener } from './events';
import type { GameController } from './GameController';
import type {
    BulletEntity,
    Direction,
    EngineSnapshot,
    GameStatus,
    LevelDefinition,
    PlayerEntity,
    Position,
    PowerupEntity,
    TankEntity,
    TileGrid,
} from './types';

const TICKS_PER_SECOND = 1000 / SIM_TICK_MS;

interface DelayedAction {
    atTick: number;
    run: () => void;
}

const makeInitialPlayer = (
    level: LevelDefinition,
    id: number,
    lives = STARTING_LIVES,
    active = true,
): PlayerEntity => {
    const spawn = level.playerStarts[id];
    return {
        id,
        position: spawn.position,
        direction: spawn.direction,
        // An eliminated player carried into the next level stays off the board.
        hidden: !active,
        inputDirection: '',
        moveTickAccumulator: 0,
        invincible: false,
        lives,
        active,
        spawn,
    };
};

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
export class Engine implements GameController {
    private levelIndex = 0;
    private level: LevelDefinition = LEVELS[0];
    private eagleTargetPositions: Position[] = [];
    private tiles: TileGrid;
    private tanks: TankEntity[] = [];
    private bullets: BulletEntity[] = [];
    private powerups: PowerupEntity[] = [];
    /** 1 for a solo game, 2 for local co-op. Set by `start()`, preserved by
     * `advanceLevel()`. */
    private playerCount = 1;
    private players: PlayerEntity[] = [];
    /** Shared run score — accrues across levels, reset by `start()` (unless
     * resuming) and `returnToMenu()`. */
    private score = 0;
    private status: GameStatus = 'idle';
    private timeRemainingSec = TIME_LIMIT_SEC;
    private tanksFrozenUntilTick = 0;
    private simTick = 0;
    private shortOfTimeEmitted = false;
    private delayedActions: DelayedAction[] = [];
    private tankKeySeq = 0;
    private powerupKeySeq = 0;
    private readonly eventBus = new EngineEventBus();

    constructor() {
        this.tiles = setupTiles(this.level.tiles);
        this.eagleTargetPositions = gridCellsToPositions(this.level.flagPosition);
        this.players = [makeInitialPlayer(this.level, 0)];
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
            powerups: this.powerups,
            players: this.players,
            player: this.players[0],
            timeRemainingSec: this.timeRemainingSec,
            levelIndex: this.levelIndex,
            totalLevels: LEVELS.length,
            lives: this.players[0].lives,
            score: this.score,
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

    /** Rebuilds every per-level entity on `levelIndex`. `carry` (passed by
     * `advanceLevel()`) preserves each player's remaining lives and
     * eliminated/active state across the level boundary; omitting it (a fresh
     * `start()`) gives everyone a full `STARTING_LIVES` pool again. */
    private resetState(levelIndex: number, carry?: { lives: number; active: boolean }[]): void {
        this.loadLevel(levelIndex);
        this.tanks = [];
        this.bullets = [];
        this.powerups = [];
        this.players = Array.from({ length: this.playerCount }, (_, id) =>
            makeInitialPlayer(this.level, id, carry?.[id]?.lives, carry?.[id]?.active ?? true),
        );
        this.timeRemainingSec = TIME_LIMIT_SEC;
        this.tanksFrozenUntilTick = 0;
        this.simTick = 0;
        this.shortOfTimeEmitted = false;
        this.delayedActions = [];
    }

    /** Shared by `start()` and `advanceLevel()` — both begin play on whatever
     * level `resetState()` just loaded. Re-broadcasting `livesChanged` here
     * (rather than only when a hit actually changes it) keeps the HUD's
     * lives count correct across a level advance too, since `gameStarted`'s
     * listener-side HUD reset doesn't know lives persisted rather than reset. */
    private beginLevel(): void {
        this.status = 'playing';
        this.emit({ type: 'gameStarted' });
        this.emit({ type: 'levelChanged', levelIndex: this.levelIndex, totalLevels: LEVELS.length });
        for (const p of this.players) this.emit({ type: 'livesChanged', playerId: p.id, lives: p.lives });
        this.emit({ type: 'scoreChanged', score: this.score });
        this.spawnWave();
    }

    private addScore(points: number): void {
        this.score += points;
        this.emit({ type: 'scoreChanged', score: this.score });
    }

    /** Starts a fresh game — from the first level, or from `resume` (a saved
     * run: level index + lives + score, produced by X3's cloud-save).
     * `playerCount` picks solo (1) vs local co-op (2). */
    start(playerCount = 1, resume?: { levelIndex: number; lives: number; score: number }): void {
        this.playerCount = Math.min(Math.max(playerCount, 1), 2);
        this.score = resume?.score ?? 0;
        if (resume) {
            const carry = Array.from({ length: this.playerCount }, () => ({ lives: resume.lives, active: true }));
            this.resetState(this.clampLevelIndex(resume.levelIndex), carry);
        } else {
            this.resetState(0);
        }
        this.beginLevel();
    }

    private clampLevelIndex(index: number): number {
        return Math.min(Math.max(Math.trunc(index) || 0, 0), LEVELS.length - 1);
    }

    /** Ports the DOM version's `gameInit()` (GameResult's restart button): back
     * to the menu, not straight back into a new game. */
    returnToMenu(): void {
        this.playerCount = 1;
        this.score = 0;
        this.resetState(0);
        this.status = 'idle';
        this.emit({ type: 'gameReset' });
    }

    /** Moves on from a cleared level to the next one, if any — a no-op unless
     * `status` is `'won'` and a next level exists (callers should check the
     * snapshot's `levelIndex`/`totalLevels` before offering this). Each
     * player's lives and eliminated state carry over. */
    advanceLevel(): void {
        if (this.status !== 'won') return;
        const nextIndex = this.levelIndex + 1;
        if (nextIndex >= LEVELS.length) return;
        this.resetState(nextIndex, this.players.map(p => ({ lives: p.lives, active: p.active })));
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

    /** `playerId` defaults to 0 so existing single-player callers (and the
     * touch ControlPanel) keep working unchanged. */
    setPlayerInputDirection(dir: Direction | '', playerId = 0): void {
        if (this.status !== 'playing') return;
        const player = this.players[playerId];
        if (!player || !player.active) return;
        if (dir === player.inputDirection) return;
        player.inputDirection = dir;
        player.moveTickAccumulator = 0;
        if (dir !== '') this.movePlayer(playerId, dir);
    }

    firePlayerBullet(playerId = 0): void {
        if (this.status !== 'playing') return;
        const player = this.players[playerId];
        if (!player || !player.active || player.hidden || player.direction === '') return;
        const spawnPos = getCurrentPosition(player.direction, player.position);
        this.fireBullet(spawnPos, player.direction, true);
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

    private movePlayer(playerId: number, dir: Direction): void {
        const player = this.players[playerId];
        if (!player || player.hidden) return;
        player.direction = dir;
        const nextPos = getCurrentPosition(dir, player.position);
        if (!inBounds(nextPos)) return;

        const tile = tileAt(this.tiles, nextPos);
        if (tile === 4) {
            this.setTile(nextPos, 0);
            player.position = nextPos;
            this.winGame();
            this.emit({ type: 'starCollected' });
            return;
        }
        if (isImpassable(tile)) return;

        // Can't drive through the co-op partner, ever (invincibility only
        // affects enemy tanks).
        if (isOccupiedByPlayers(this.players, nextPos, playerId)) return;

        const collidingTank = this.tanks.find(t => cellsEqual(t.position, nextPos));
        if (collidingTank) {
            // Invincibility turns "blocked by a tank" into "destroy it and
            // drive through" — otherwise this is the same block as a wall.
            if (!player.invincible) return;
            this.destroyTank(collidingTank.keyIndex, collidingTank.position);
        }

        const powerupIndex = this.powerups.findIndex(p => cellsEqual(p.position, nextPos));
        if (powerupIndex !== -1) {
            const [powerup] = this.powerups.splice(powerupIndex, 1);
            this.applyPowerup(playerId, powerup.kind);
            this.emit({ type: 'powerupCollected', kind: powerup.kind });
        }

        player.position = nextPos;
    }

    private tickPlayerMovement(): void {
        for (const player of this.players) {
            if (player.hidden || player.inputDirection === '') continue;
            player.moveTickAccumulator++;
            if (player.moveTickAccumulator >= TANK_MOVE_TICKS) {
                player.moveTickAccumulator = 0;
                this.movePlayer(player.id, player.inputDirection);
            }
        }
    }

    private hitPlayer(playerId: number): void {
        const player = this.players[playerId];
        if (!player || player.hidden || player.invincible) return;
        player.hidden = true;
        player.inputDirection = '';
        this.releaseBoom(player.position);
        this.emit({ type: 'playerHit', playerId });

        player.lives--;
        this.emit({ type: 'livesChanged', playerId, lives: player.lives });
        if (player.lives <= 0) {
            player.active = false;
            // The run is only over once every player is out of lives.
            if (this.players.every(p => !p.active)) {
                this.scheduleAfterTicks(GAME_OVER_DELAY_TICKS, () => this.loseGame());
            }
        } else {
            this.scheduleAfterTicks(GAME_OVER_DELAY_TICKS, () => this.respawnPlayer(playerId));
        }
    }

    private respawnPlayer(playerId: number): void {
        if (this.status !== 'playing') return;
        const carried = this.players[playerId];
        if (!carried || !carried.active) return;
        this.players[playerId] = makeInitialPlayer(this.level, playerId, carried.lives, true);
        this.emit({ type: 'playerRespawned', playerId });
    }

    // ---- powerups ----

    private nextPowerupKey(): string {
        return `powerup_${Date.now()}_${this.powerupKeySeq++}`;
    }

    private spawnPowerup(): void {
        const occupied = [
            ...this.players.filter(p => !p.hidden).map(p => p.position),
            ...this.tanks.map(t => t.position),
        ];
        const position = findRandomPassablePosition(this.tiles, occupied);
        if (!position) return; // no free cell right now — try again next interval

        const powerup: PowerupEntity = { keyIndex: this.nextPowerupKey(), position, kind: pickPowerupKind() };
        this.powerups.push(powerup);
        this.emit({ type: 'powerupSpawned', keyIndex: powerup.keyIndex, position, kind: powerup.kind });
    }

    /** Applies a picked-up powerup's effect. Both effects reuse the
     * `delayedActions` mechanism already proven for the eagle-hit/treasure
     * timers, so they correctly freeze in place across a pause for free. */
    private applyPowerup(playerId: number, kind: PowerupEntity['kind']): void {
        switch (kind) {
            case 'invincibility': {
                const player = this.players[playerId];
                player.invincible = true;
                this.scheduleAfterTicks(INVINCIBILITY_DURATION_TICKS, () => {
                    player.invincible = false;
                });
                break;
            }
            case 'freeze':
                this.tanksFrozenUntilTick = this.simTick + FREEZE_DURATION_TICKS;
                break;
        }
    }

    // ---- tanks ----

    private tickTanks(): void {
        if (this.simTick < this.tanksFrozenUntilTick) return;
        for (const tank of this.tanks) {
            tank.moveTickAccumulator++;
            if (tank.moveTickAccumulator < TANK_MOVE_TICKS) continue;
            tank.moveTickAccumulator = 0;

            const { tank: updated, fired } = tickEnemyTank(
                tank, this.tiles, this.tanks, this.players, this.eagleTargetPositions,
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
        this.addScore(SCORE_PER_TANK);
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

        const outcome = checkBulletAtSpawn(bullet, this.tiles, this.tanks, this.players);
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
                this.hitPlayer(outcome.playerId);
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
            const outcome = tickBullet(bullet, this.tiles, this.tanks, this.players);
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
        if (this.powerups.length === 0 && shouldSpawnPowerup(this.timeRemainingSec)) this.spawnPowerup();
    }

    // ---- win/lose ----

    private winGame(): void {
        if (this.status !== 'playing') return;
        this.status = 'won';
        this.tanks = [];
        this.addScore(SCORE_LEVEL_CLEAR + this.timeRemainingSec * SCORE_TIME_BONUS_PER_SEC);
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
