import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChangeDirection, tickEnemyTank } from './ai.system';
import type { PlayerEntity, TankEntity, TileGrid } from '../types';

const openTiles: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));

const makeTank = (overrides: Partial<TankEntity> = {}): TankEntity => ({
    keyIndex: 1,
    position: [100, 100],
    direction: 'SOUTH',
    fireTick: 0,
    moveTickAccumulator: 0,
    ...overrides,
});

const makePlayer = (overrides: Partial<PlayerEntity> = {}): PlayerEntity => ({
    position: [280, 460],
    direction: 'NORTH',
    hidden: false,
    inputDirection: '',
    moveTickAccumulator: 0,
    ...overrides,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getChangeDirection', () => {
    it.each([
        [0, 'SOUTH'],
        [0.24, 'SOUTH'],
        [0.25, 'NORTH'],
        [0.49, 'NORTH'],
        [0.5, 'EAST'],
        [0.74, 'EAST'],
        [0.75, 'WEST'],
        [0.99, 'WEST'],
    ] as const)('random=%p -> %s', (random, direction) => {
        vi.spyOn(Math, 'random').mockReturnValue(random);
        expect(getChangeDirection()).toBe(direction);
    });
});

describe('tickEnemyTank', () => {
    const farAwayPlayer = makePlayer({ position: [780, 20] });

    it('moves forward and increments fireTick on a successful, non-redirect tick', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5); // below the 0.9 redirect threshold
        const tank = makeTank({ fireTick: 1 });
        const { tank: next, fired } = tickEnemyTank(tank, openTiles, [tank], farAwayPlayer);
        expect(next.position).toEqual([100, 120]); // SOUTH move
        expect(next.fireTick).toBe(2);
        expect(fired).toBe(false);
    });

    it('fires and resets fireTick to 0 on the 5th successful move, without changing direction', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const tank = makeTank({ fireTick: 4 });
        const { tank: next, fired } = tickEnemyTank(tank, openTiles, [tank], farAwayPlayer);
        expect(fired).toBe(true);
        expect(next.fireTick).toBe(0);
        expect(next.direction).toBe('SOUTH');
    });

    it('redirects without moving, but still accumulates fireTick, on the 10% random-change roll', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.95) // >= 0.9 triggers redirect
            .mockReturnValueOnce(0.1); // getChangeDirection's own roll -> SOUTH
        const tank = makeTank({ position: [100, 100], fireTick: 3 });
        const { tank: next, fired } = tickEnemyTank(tank, openTiles, [tank], farAwayPlayer);
        expect(next.position).toEqual([100, 100]);
        expect(next.fireTick).toBe(4);
        expect(next.direction).toBe('SOUTH');
        expect(fired).toBe(false);
    });

    it('redirects without moving, but still accumulates fireTick, when the next cell is impassable', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1) // below redirect threshold, but blocked below
            .mockReturnValueOnce(0.6); // getChangeDirection's own roll -> EAST
        const blockedTiles: TileGrid = openTiles.map(row => row.slice());
        blockedTiles[6][5] = 5; // wall directly south of (100,100)
        const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 2 });
        const { tank: next, fired } = tickEnemyTank(tank, blockedTiles, [tank], farAwayPlayer);
        expect(next.position).toEqual([100, 100]);
        expect(next.fireTick).toBe(3);
        expect(next.direction).toBe('EAST');
        expect(fired).toBe(false);
    });

    it('redirects without moving when the next cell is out of bounds', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.6);
        const tank = makeTank({ position: [0, 0], direction: 'WEST', fireTick: 0 });
        const { tank: next, fired } = tickEnemyTank(tank, openTiles, [tank], farAwayPlayer);
        expect(next.position).toEqual([0, 0]);
        expect(fired).toBe(false);
    });

    it('a tank stuck against a wall still eventually reaches the fire threshold (regression: enemy tanks used to be able to go indefinitely without firing while cornered)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1); // always below the redirect threshold
        const blockedTiles: TileGrid = openTiles.map(row => row.slice());
        blockedTiles[6][5] = 5; // wall directly south of (100,100)
        let tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
        let fired = false;
        for (let i = 0; i < 5 && !fired; i++) {
            ({ tank, fired } = tickEnemyTank(tank, blockedTiles, [tank], farAwayPlayer));
        }
        expect(fired).toBe(true);
        expect(tank.position).toEqual([100, 100]); // never actually moved, only redirected
    });

    it('redirects without moving when the next cell is occupied by another tank', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.6);
        const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
        const otherTank = makeTank({ keyIndex: 2, position: [100, 120] }); // directly south
        const { tank: next } = tickEnemyTank(tank, openTiles, [tank, otherTank], farAwayPlayer);
        expect(next.position).toEqual([100, 100]);
    });

    it('redirects without moving when the next cell is occupied by the player', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.6);
        const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
        const player = makePlayer({ position: [100, 120] }); // directly south
        const { tank: next } = tickEnemyTank(tank, openTiles, [tank], player);
        expect(next.position).toEqual([100, 100]);
    });

    it('is not blocked by a hidden player occupying the next cell', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
        const hiddenPlayer = makePlayer({ position: [100, 120], hidden: true });
        const { tank: next } = tickEnemyTank(tank, openTiles, [tank], hiddenPlayer);
        expect(next.position).toEqual([100, 120]);
    });
});
