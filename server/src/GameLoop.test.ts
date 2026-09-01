import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from './GameLoop';
import { SIM_TICK_MS } from '../../src/engine/constants';

describe('GameLoop', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('is not running until started, and running after start()', () => {
        const loop = new GameLoop();
        expect(loop.isRunning).toBe(false);
        loop.start();
        expect(loop.isRunning).toBe(true);
        expect(loop.getSnapshot().status).toBe('playing');
        loop.stop();
        expect(loop.isRunning).toBe(false);
    });

    it('advances the engine exactly one tick per interval', () => {
        const loop = new GameLoop();
        loop.start();
        const secondsAtStart = loop.getSnapshot().timeRemainingSec;

        // The engine drops one second every TICKS_PER_SECOND ticks.
        const ticksPerSecond = 1000 / SIM_TICK_MS;
        vi.advanceTimersByTime(SIM_TICK_MS * ticksPerSecond);

        expect(loop.getSnapshot().timeRemainingSec).toBe(secondsAtStart - 1);
        loop.stop();
    });

    it('honours a custom tickMs', () => {
        const loop = new GameLoop({ tickMs: 10 });
        loop.start();
        const before = loop.getSnapshot().timeRemainingSec;
        vi.advanceTimersByTime(10 * (1000 / SIM_TICK_MS));
        expect(loop.getSnapshot().timeRemainingSec).toBe(before - 1);
        loop.stop();
    });

    it('stops ticking after stop()', () => {
        const loop = new GameLoop();
        loop.start();
        vi.advanceTimersByTime(SIM_TICK_MS * 5);
        loop.stop();
        const frozen = loop.getSnapshot();
        vi.advanceTimersByTime(SIM_TICK_MS * 1000);
        expect(loop.getSnapshot().timeRemainingSec).toBe(frozen.timeRemainingSec);
    });

    it('start() restarts a fresh game rather than stacking intervals', () => {
        const loop = new GameLoop();
        loop.start(2);
        vi.advanceTimersByTime(SIM_TICK_MS * (1000 / SIM_TICK_MS) * 3); // ~3s in
        loop.start(2); // restart
        expect(loop.getSnapshot().timeRemainingSec).toBe(180); // back to full time
        loop.stop();
    });

    it('start(2) runs a 2-player game', () => {
        const loop = new GameLoop();
        loop.start(2);
        expect(loop.getSnapshot().players).toHaveLength(2);
        loop.stop();
    });

    it('routes applyInput to the addressed player', () => {
        const loop = new GameLoop();
        loop.start(2);
        const p2Start = loop.getSnapshot().players[1].position;

        loop.applyInput(1, { direction: 'NORTH' }); // immediate first step on input change
        expect(loop.getSnapshot().players[1].position).not.toEqual(p2Start);
        expect(loop.getSnapshot().players[0].position).toEqual(loop.getSnapshot().players[0].spawn.position);
        loop.stop();
    });

    it('applyInput fire spawns a player bullet', () => {
        const loop = new GameLoop();
        loop.start();
        expect(loop.getSnapshot().bullets).toHaveLength(0);
        loop.applyInput(0, { fire: true });
        expect(loop.getSnapshot().bullets.length).toBeGreaterThanOrEqual(1);
        loop.stop();
    });

    it('forwards engine events to onEvent subscribers', () => {
        const loop = new GameLoop();
        const seen: string[] = [];
        loop.onEvent((e) => seen.push(e.type));
        loop.start();
        expect(seen).toContain('gameStarted');
        expect(seen).toContain('tankSpawned');
        loop.stop();
    });

    it('togglePause freezes the simulation while the interval keeps firing', () => {
        const loop = new GameLoop();
        loop.start();
        vi.advanceTimersByTime(SIM_TICK_MS * 3);
        loop.togglePause();
        const paused = loop.getSnapshot();
        expect(paused.status).toBe('paused');
        vi.advanceTimersByTime(SIM_TICK_MS * 1000);
        expect(loop.getSnapshot().timeRemainingSec).toBe(paused.timeRemainingSec);
        loop.stop();
    });
});
