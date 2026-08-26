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

    it('a tank fully boxed in on all 4 sides still eventually reaches the fire threshold (regression: enemy tanks used to be able to go indefinitely without firing while cornered)', () => {
        // A single-wall block (the original regression scenario) is no longer
        // enough to pin the tank in place: pathfinding now routes around a
        // single obstruction instead of blindly re-picking a direction that
        // might also be blocked, so this test boxes the tank in on every
        // side — the one case pathfinding genuinely can't escape — to keep
        // testing the actual regression (fire threshold reached even when
        // movement is impossible), not the now-improved single-wall case.
        vi.spyOn(Math, 'random').mockReturnValue(0.1); // always below the redirect threshold
        const blockedTiles: TileGrid = openTiles.map(row => row.slice());
        blockedTiles[4][5] = 5; // north
        blockedTiles[6][5] = 5; // south
        blockedTiles[5][4] = 5; // west
        blockedTiles[5][6] = 5; // east
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

    describe('targeting (aim + pathfinding)', () => {
        it('turns to aim at the player and holds position when there is a clear grid-aligned shot, instead of wandering', () => {
            const tank = makeTank({ position: [100, 100], direction: 'NORTH', fireTick: 0 });
            const player = makePlayer({ position: [100, 300] }); // same column, south of the tank
            const { tank: next, fired } = tickEnemyTank(tank, openTiles, [tank], player);
            expect(next.direction).toBe('SOUTH');
            expect(next.position).toEqual([100, 100]);
            expect(fired).toBe(false);
        });

        it('does not aim through a wall even when the player is otherwise grid-aligned, and falls back to normal movement', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5); // no redirect
            const tiles: TileGrid = openTiles.map(row => row.slice());
            tiles[10][5] = 5; // wall between the tank and the player, same column
            const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
            const player = makePlayer({ position: [100, 300] });
            const { tank: next } = tickEnemyTank(tank, tiles, [tank], player);
            expect(next.direction).toBe('SOUTH');
            expect(next.position).toEqual([100, 120]); // moved forward normally, did not freeze to "aim"
        });

        it('aims at the eagle when the player is hidden', () => {
            const tank = makeTank({ position: [320, 100], direction: 'NORTH', fireTick: 0 });
            const hiddenPlayer = makePlayer({ hidden: true });
            const { tank: next } = tickEnemyTank(tank, openTiles, [tank], hiddenPlayer);
            expect(next.direction).toBe('SOUTH'); // toward the eagle sub-tile at (320, 440)
            expect(next.position).toEqual([320, 100]);
        });

        it('aims at the eagle when the player is visible but not grid-aligned, and the eagle is', () => {
            const tank = makeTank({ position: [320, 100], direction: 'NORTH', fireTick: 0 });
            const { tank: next } = tickEnemyTank(tank, openTiles, [tank], farAwayPlayer);
            expect(next.direction).toBe('SOUTH');
        });

        it('redirects via pathfinding around a local obstruction instead of a flat random pick, when forced to redirect', () => {
            vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.95) // >= 0.9, forces a redirect regardless of canMove
                .mockReturnValueOnce(0.1); // < EAGLE_TARGET_BIAS -> hunt the eagle
            const tiles: TileGrid = openTiles.map(row => row.slice());
            tiles[4][5] = 5; // north wall
            tiles[6][5] = 5; // south wall
            tiles[5][4] = 5; // west wall
            // east left open — the only viable first step, so the result is
            // unambiguous regardless of how ties elsewhere in the BFS resolve.
            const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
            const { tank: next } = tickEnemyTank(tank, tiles, [tank], farAwayPlayer);
            expect(next.direction).toBe('EAST');
            expect(next.position).toEqual([100, 100]); // a redirect never moves on the same tick
        });

        it('falls back to a flat random direction when pathfinding cannot reach any target (fully boxed in)', () => {
            vi.spyOn(Math, 'random')
                .mockReturnValueOnce(0.95) // forces a redirect
                .mockReturnValueOnce(0.1) // hunt the eagle (unreachable)
                .mockReturnValueOnce(0.6); // getChangeDirection's own roll -> EAST
            const tiles: TileGrid = openTiles.map(row => row.slice());
            tiles[4][5] = 5;
            tiles[6][5] = 5;
            tiles[5][4] = 5;
            tiles[5][6] = 5; // boxed in on all 4 sides — no path to anything
            const tank = makeTank({ position: [100, 100], direction: 'SOUTH', fireTick: 0 });
            const { tank: next } = tickEnemyTank(tank, tiles, [tank], farAwayPlayer);
            expect(next.direction).toBe('EAST');
        });
    });
});
