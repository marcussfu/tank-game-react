import { afterEach, describe, expect, it, vi } from 'vitest';
import { Engine } from './Engine';
import { FREEZE_DURATION_TICKS, GAME_OVER_DELAY_TICKS, POWERUP_SPAWN_INTERVAL_SEC, SIM_TICK_MS, STARTING_LIVES } from './constants';
import type { EngineEvent } from './events';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('start', () => {
    it('spawns the 3 fixed enemy tanks and enters playing status', () => {
        const engine = new Engine();
        engine.start();
        const snap = engine.getSnapshot();
        expect(snap.status).toBe('playing');
        expect(snap.tanks.map(t => t.position)).toEqual([[0, 0], [780, 460], [740, 0]]);
        expect(snap.tanks.map(t => t.direction)).toEqual(['SOUTH', 'NORTH', 'WEST']);
        expect(snap.player.position).toEqual([280, 460]);
        expect(snap.timeRemainingSec).toBe(180);
    });

    it('emits gameStarted before the tankSpawned events, so a listener resetting on gameStarted sees the spawns', () => {
        const engine = new Engine();
        const events: EngineEvent[] = [];
        engine.on(e => events.push(e));
        engine.start();
        expect(events.map(e => e.type)).toEqual([
            'gameStarted', 'levelChanged', 'livesChanged', 'tankSpawned', 'tankSpawned', 'tankSpawned',
        ]);
    });

    it('always starts on the first level', () => {
        const engine = new Engine();
        engine.start();
        expect(engine.getSnapshot().levelIndex).toBe(0);
        expect(engine.getSnapshot().totalLevels).toBeGreaterThan(1);
    });
});

describe('advanceLevel', () => {
    it('is a no-op unless status is won', () => {
        const engine = new Engine();
        engine.start();
        engine.advanceLevel();
        expect(engine.getSnapshot().levelIndex).toBe(0);
        expect(engine.getSnapshot().status).toBe('playing');
    });

    it('moves to the next level, resets the map/tanks/player/timer, and resumes play', () => {
        const engine = new Engine();
        engine.start();
        // Force a win without playing through a full level.
        engine.getSnapshot().tiles[23][15] = 4; // reveal the star one cell east of the player
        engine.setPlayerInputDirection('EAST');
        expect(engine.getSnapshot().status).toBe('won');

        const levelBefore = engine.getSnapshot().levelIndex;
        engine.advanceLevel();

        const snap = engine.getSnapshot();
        expect(snap.status).toBe('playing');
        expect(snap.levelIndex).toBe(levelBefore + 1);
        expect(snap.timeRemainingSec).toBe(180);
        expect(snap.tanks.length).toBeGreaterThan(0);
    });

    it('is a no-op on the last level (no next level to advance to)', () => {
        const engine = new Engine();
        engine.start();
        const totalLevels = engine.getSnapshot().totalLevels;

        // Win and advance all the way to the last level.
        for (let i = 0; i < totalLevels - 1; i++) {
            engine.getSnapshot().tiles[23][15] = 4;
            engine.setPlayerInputDirection('EAST');
            engine.advanceLevel();
        }
        expect(engine.getSnapshot().levelIndex).toBe(totalLevels - 1);

        engine.getSnapshot().tiles[23][15] = 4;
        engine.setPlayerInputDirection('EAST');
        expect(engine.getSnapshot().status).toBe('won');

        engine.advanceLevel();
        expect(engine.getSnapshot().status).toBe('won'); // unchanged: nothing to advance to
        expect(engine.getSnapshot().levelIndex).toBe(totalLevels - 1);
    });
});

describe('returnToMenu', () => {
    it('ports gameInit(): back to idle status with everything cleared, not straight into a new game', () => {
        const engine = new Engine();
        engine.start();

        const events: EngineEvent[] = [];
        engine.on(e => events.push(e));
        engine.returnToMenu();

        const snap = engine.getSnapshot();
        expect(snap.status).toBe('idle');
        expect(snap.tanks).toHaveLength(0);
        expect(snap.bullets).toHaveLength(0);
        expect(snap.timeRemainingSec).toBe(180);
        expect(events.map(e => e.type)).toEqual(['gameReset']);

        // tick() is a no-op outside 'playing', matching every other non-playing status
        engine.tick();
        expect(engine.getSnapshot().timeRemainingSec).toBe(180);
    });
});

describe('player collecting the star', () => {
    it('walking onto an already-revealed star tile wins immediately and fires the right events', () => {
        const engine = new Engine();
        engine.start();

        // A bullet has to reveal the treasure as a star (tile value 4) before
        // the player can walk onto it — walking into the still-disguised
        // treasure (value 12, indistinguishable from a wall) is blocked, same
        // as any other impassable tile. Reach into the live tiles reference
        // `getSnapshot()` exposes (the same one the renderer reads every
        // frame) to set up that precondition directly, one cell EAST of the
        // player's start position [280,460], rather than round-tripping
        // through a real bullet hit + delayed reveal.
        engine.getSnapshot().tiles[23][15] = 4;

        const events: EngineEvent[] = [];
        engine.on(e => events.push(e));

        engine.setPlayerInputDirection('EAST');

        const snap = engine.getSnapshot();
        expect(snap.status).toBe('won');
        expect(snap.player.position).toEqual([300, 460]);
        expect(snap.tiles[23][15]).toBe(0);
        expect(snap.tanks).toHaveLength(0);
        expect(events.map(e => e.type)).toEqual(expect.arrayContaining(['starCollected', 'gameWon']));
    });
});

describe('firing at point-blank range', () => {
    it('destroys a wall directly in front of the shooter instead of phasing through to whatever is beyond it', () => {
        const engine = new Engine();
        engine.start();

        // Player starts at [280,460]; the real map has a wall at [23][15]
        // (pixel [300,460]), one cell EAST, with the eagle base sitting
        // right behind it at [23][16]/[23][17]. Before the checkBulletAtSpawn
        // fix, a bullet fired here spawned embedded in the wall cell and was
        // only ever classified one cell further (the eagle) on its first
        // tick — destroying the eagle directly and leaving the wall in front
        // of it untouched, exactly the bug the user found by playing.
        expect(engine.getSnapshot().tiles[23][15]).toBe(5);

        engine.setPlayerInputDirection('EAST'); // faces east; blocked by the wall, doesn't move
        engine.firePlayerBullet();

        expect(engine.getSnapshot().tiles[23][15]).toBe(9); // the wall booms...
        expect(engine.getSnapshot().status).toBe('playing'); // ...the eagle is untouched, game not lost

        for (let i = 0; i < 2; i++) engine.tick(); // BOOM_DURATION_TICKS
        expect(engine.getSnapshot().tiles[23][15]).toBe(0); // wall permanently destroyed
    });
});

describe('player-tank collision', () => {
    it('blocks the player from walking onto a cell occupied by an enemy tank (M0 playtesting gap: this never did anything in the DOM version)', () => {
        const engine = new Engine();
        engine.start();

        // Player starts at [280,460] (row 23, col 14). Force the cell one
        // step WEST ([260,460], row 23 col 13) to grass so the block below
        // is provably about the tank, not the real map's wall geometry
        // (col 15 there is a wall — see the point-blank-range test above),
        // same live-reference technique the star-collection test uses.
        const snap = engine.getSnapshot();
        snap.tiles[23][13] = 0;
        snap.tanks.length = 0;
        snap.tanks.push({ keyIndex: 999, position: [260, 460], direction: 'SOUTH', fireTick: 0, moveTickAccumulator: 0 });

        engine.setPlayerInputDirection('WEST');

        expect(engine.getSnapshot().player.position).toEqual([280, 460]); // blocked, same as walking into a wall
    });
});

describe('powerups', () => {
    it('picking up invincibility sets player.invincible and removes the powerup from the map', () => {
        const engine = new Engine();
        engine.start();
        engine.getSnapshot().powerups.push({ keyIndex: 'p1', position: [260, 460], kind: 'invincibility' });

        const events: EngineEvent[] = [];
        engine.on(e => events.push(e));
        engine.setPlayerInputDirection('WEST'); // one cell west of [280,460] — grass, per the collision test above

        const snap = engine.getSnapshot();
        expect(snap.player.invincible).toBe(true);
        expect(snap.powerups).toHaveLength(0);
        expect(events.map(e => e.type)).toContain('powerupCollected');
    });

    it('an invincible player destroys a tank it drives into, instead of being blocked by it', () => {
        const engine = new Engine();
        engine.start();
        const snap = engine.getSnapshot();
        snap.tiles[23][13] = 0; // defensively grass, same as the plain player-tank-collision test
        snap.tanks.length = 0;
        snap.tanks.push({ keyIndex: 999, position: [260, 460], direction: 'SOUTH', fireTick: 0, moveTickAccumulator: 0 });
        snap.player.invincible = true;

        engine.setPlayerInputDirection('WEST');

        const after = engine.getSnapshot();
        expect(after.tanks).toHaveLength(0);
        expect(after.player.position).toEqual([260, 460]); // drove through, not blocked
    });

    it('freeze stops enemy tanks from moving while active', () => {
        const engine = new Engine();
        engine.start();
        engine.getSnapshot().powerups.push({ keyIndex: 'p1', position: [260, 460], kind: 'freeze' });
        engine.setPlayerInputDirection('WEST');

        const before = engine.getSnapshot().tanks.map(t => t.position);
        for (let i = 0; i < FREEZE_DURATION_TICKS - 1; i++) engine.tick();
        const during = engine.getSnapshot().tanks.map(t => t.position);
        expect(during).toEqual(before);
    });

    // The player never moves in these two, so keep it alive by clearing the
    // enemy tanks/bullets each tick — otherwise the spawn wave guns down the
    // stationary player and burns all 3 lives long before the 30s spawn mark.
    const tickKeepingPlayerAlive = (engine: Engine, ticks: number): void => {
        for (let i = 0; i < ticks; i++) {
            const snap = engine.getSnapshot();
            snap.tanks.length = 0;
            snap.bullets.length = 0;
            engine.tick();
        }
    };

    it('spawns a powerup after POWERUP_SPAWN_INTERVAL_SEC seconds of play, if none exists yet', () => {
        const engine = new Engine();
        engine.start();
        expect(engine.getSnapshot().powerups).toHaveLength(0);

        const ticksPerSecond = 1000 / SIM_TICK_MS;
        tickKeepingPlayerAlive(engine, POWERUP_SPAWN_INTERVAL_SEC * ticksPerSecond);

        expect(engine.getSnapshot().powerups.length).toBeGreaterThanOrEqual(1);
    });

    it('does not spawn a second powerup while one is already on the map', () => {
        const engine = new Engine();
        engine.start();
        const ticksPerSecond = 1000 / SIM_TICK_MS;
        tickKeepingPlayerAlive(engine, POWERUP_SPAWN_INTERVAL_SEC * ticksPerSecond * 2); // 2 intervals' worth
        expect(engine.getSnapshot().powerups).toHaveLength(1);
    });
});

describe('lives and respawn', () => {
    it('a hit decrements lives and respawns the player instead of ending the game, while lives remain', () => {
        const engine = new Engine();
        engine.start();
        expect(engine.getSnapshot().lives).toBe(STARTING_LIVES);

        engine.getSnapshot().bullets.push({ keyIndex: 'eb1', position: [280, 440], direction: 'SOUTH', isPlayerBullet: false });
        engine.tick(); // the bullet advances onto the player's cell -> hitPlayer()

        let snap = engine.getSnapshot();
        expect(snap.player.hidden).toBe(true);
        expect(snap.lives).toBe(STARTING_LIVES - 1);
        expect(snap.status).toBe('playing'); // not game over yet

        for (let i = 0; i < GAME_OVER_DELAY_TICKS; i++) engine.tick();
        snap = engine.getSnapshot();
        expect(snap.status).toBe('playing'); // still playing: respawned, not lost
        expect(snap.player.hidden).toBe(false);
        expect(snap.player.position).toEqual([280, 460]); // back at the level's start position
    });

    it('does not hit an invincible player at all', () => {
        const engine = new Engine();
        engine.start();
        engine.getSnapshot().player.invincible = true;
        engine.getSnapshot().bullets.push({ keyIndex: 'eb1', position: [280, 440], direction: 'SOUTH', isPlayerBullet: false });
        engine.tick();

        const snap = engine.getSnapshot();
        expect(snap.player.hidden).toBe(false);
        expect(snap.lives).toBe(STARTING_LIVES);
    });

    it('loses the game once lives reach 0', () => {
        const engine = new Engine();
        engine.start();

        for (let hit = 0; hit < STARTING_LIVES; hit++) {
            engine.getSnapshot().bullets.push({
                keyIndex: `eb${hit}`, position: [280, 440], direction: 'SOUTH', isPlayerBullet: false,
            });
            engine.tick();
            for (let i = 0; i < GAME_OVER_DELAY_TICKS; i++) engine.tick();
        }

        expect(engine.getSnapshot().status).toBe('lost');
        expect(engine.getSnapshot().lives).toBe(0);
    });

    it('lives persist across advanceLevel, but reset to STARTING_LIVES on a fresh start()', () => {
        const engine = new Engine();
        engine.start();
        engine.getSnapshot().bullets.push({ keyIndex: 'eb1', position: [280, 440], direction: 'SOUTH', isPlayerBullet: false });
        engine.tick();
        for (let i = 0; i < GAME_OVER_DELAY_TICKS; i++) engine.tick();
        expect(engine.getSnapshot().lives).toBe(STARTING_LIVES - 1);

        engine.getSnapshot().tiles[23][15] = 4;
        engine.setPlayerInputDirection('EAST'); // win
        engine.advanceLevel();
        expect(engine.getSnapshot().lives).toBe(STARTING_LIVES - 1); // carried over, not reset

        engine.start(); // a brand new game
        expect(engine.getSnapshot().lives).toBe(STARTING_LIVES);
    });
});

describe('pause', () => {
    it('togglePause flips between playing and paused, emitting gamePaused/gameResumed, and does nothing from any other status', () => {
        const engine = new Engine();
        expect(engine.getSnapshot().status).toBe('idle');
        engine.togglePause();
        expect(engine.getSnapshot().status).toBe('idle'); // no-op: not playing

        engine.start();
        const events: EngineEvent[] = [];
        engine.on(e => events.push(e));

        engine.togglePause();
        expect(engine.getSnapshot().status).toBe('paused');
        engine.togglePause();
        expect(engine.getSnapshot().status).toBe('playing');
        // engineBridge relies on these to mirror pause into Redux (M3: the
        // StateBar pause button and CanvasStage's Escape key otherwise had
        // no visible effect, since only the Engine's internal status flipped).
        expect(events.map(e => e.type)).toEqual(['gamePaused', 'gameResumed']);
    });

    it('freezes the clock (and therefore every scheduled/derived effect) until resumed', () => {
        const engine = new Engine();
        engine.start();

        for (let i = 0; i < 20; i++) engine.tick(); // 20 ticks * 50ms = 1 real second
        expect(engine.getSnapshot().timeRemainingSec).toBe(179);

        engine.pause();
        for (let i = 0; i < 100; i++) engine.tick(); // would be 5 more seconds if not paused
        expect(engine.getSnapshot().status).toBe('paused');
        expect(engine.getSnapshot().timeRemainingSec).toBe(179);

        engine.resume();
        for (let i = 0; i < 20; i++) engine.tick();
        expect(engine.getSnapshot().timeRemainingSec).toBe(178);
    });
});
