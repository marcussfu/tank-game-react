import { vi } from 'vitest';
import type { Engine } from '../engine/Engine';
import type { EngineSnapshot } from '../engine/types';

const makePlayer = (id: number): EngineSnapshot['players'][number] => ({
    id,
    position: id === 0 ? [280, 460] : [200, 460],
    direction: 'NORTH',
    hidden: false,
    inputDirection: '',
    moveTickAccumulator: 0,
    invincible: false,
    lives: 3,
    active: true,
    spawn: { position: id === 0 ? [280, 460] : [200, 460], direction: 'NORTH' },
});

const emptySnapshot = (): EngineSnapshot => {
    const players = [makePlayer(0)];
    return {
        status: 'playing',
        tiles: Array.from({ length: 24 }, () => Array(40).fill(0)),
        tanks: [],
        bullets: [],
        powerups: [],
        players,
        player: players[0],
        timeRemainingSec: 180,
        levelIndex: 0,
        totalLevels: 1,
        lives: players[0].lives,
    };
};

/** A test double for `Engine` — components only ever call a handful of its
 * methods, so this implements just those (typed loosely via `as Engine`
 * rather than satisfying every real method) with `vi.fn()` spies. */
export const makeFakeEngine = (overrides: Partial<Engine> = {}): Engine => ({
    on: vi.fn(() => () => {}),
    start: vi.fn(),
    returnToMenu: vi.fn(),
    advanceLevel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    togglePause: vi.fn(),
    setPlayerInputDirection: vi.fn(),
    firePlayerBullet: vi.fn(),
    tick: vi.fn(),
    getSnapshot: vi.fn(emptySnapshot),
    ...overrides,
} as unknown as Engine);
