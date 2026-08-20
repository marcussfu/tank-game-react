import { afterEach, describe, expect, it, vi } from 'vitest';
import { Engine } from './Engine';
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

describe('pause', () => {
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
