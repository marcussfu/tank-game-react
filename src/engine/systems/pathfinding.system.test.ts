import { describe, expect, it } from 'vitest';
import { findNextStep } from './pathfinding.system';
import type { PlayerEntity, Position, TankEntity, TileGrid } from '../types';

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
    position: [780, 20],
    direction: 'NORTH',
    hidden: false,
    inputDirection: '',
    moveTickAccumulator: 0,
    invincible: false,
    ...overrides,
});

const farAwayPlayer = makePlayer();

describe('findNextStep', () => {
    it('returns null for an empty target list', () => {
        expect(findNextStep(openTiles, [100, 100], [], [], farAwayPlayer, 1)).toBeNull();
    });

    it('returns null when start is already on a target cell', () => {
        expect(findNextStep(openTiles, [100, 100], [[100, 100]], [], farAwayPlayer, 1)).toBeNull();
    });

    it('returns the direction of a directly adjacent target', () => {
        const targets: Position[] = [[100, 120]]; // one cell south
        expect(findNextStep(openTiles, [100, 100], targets, [], farAwayPlayer, 1)).toBe('SOUTH');
    });

    it('picks the only viable first step around a local obstruction, regardless of the target beyond it', () => {
        const tiles: TileGrid = openTiles.map(row => row.slice());
        tiles[4][5] = 5; // north wall
        tiles[6][5] = 5; // south wall
        tiles[5][4] = 5; // west wall
        // east left open
        const targets: Position[] = [[100, 300]]; // far south — unreachable directly, only via east detour
        expect(findNextStep(tiles, [100, 100], targets, [], farAwayPlayer, 1)).toBe('EAST');
    });

    it('returns null when every target is unreachable (fully boxed in)', () => {
        const tiles: TileGrid = openTiles.map(row => row.slice());
        tiles[4][5] = 5;
        tiles[6][5] = 5;
        tiles[5][4] = 5;
        tiles[5][6] = 5;
        const targets: Position[] = [[500, 500]];
        expect(findNextStep(tiles, [100, 100], targets, [], farAwayPlayer, 1)).toBeNull();
    });

    it('routes around another tank occupying the direct path', () => {
        const blockerTank = makeTank({ keyIndex: 2, position: [100, 120] }); // directly south
        const targets: Position[] = [[100, 140]]; // two cells south, behind the blocker
        const step = findNextStep(openTiles, [100, 100], targets, [blockerTank], farAwayPlayer, 1);
        expect(step).not.toBe('SOUTH'); // can't path straight through the other tank
        expect(step).not.toBeNull();
    });

    it('does not treat the searching tank itself as an obstacle', () => {
        const self = makeTank({ keyIndex: 1, position: [100, 100] });
        const targets: Position[] = [[100, 120]];
        expect(findNextStep(openTiles, [100, 100], targets, [self], farAwayPlayer, 1)).toBe('SOUTH');
    });

    it('still reaches a target cell that is occupied by the player (e.g. hunting the player itself)', () => {
        const player = makePlayer({ position: [100, 120] }); // directly south, the target itself
        const targets: Position[] = [[100, 120]];
        expect(findNextStep(openTiles, [100, 100], targets, [], player, 1)).toBe('SOUTH');
    });

    it('treats a non-target cell occupied by the player as an obstacle', () => {
        const player = makePlayer({ position: [100, 120] }); // directly south, blocking the path
        const targets: Position[] = [[100, 140]]; // two cells south, behind the player
        const step = findNextStep(openTiles, [100, 100], targets, [], player, 1);
        expect(step).not.toBe('SOUTH');
        expect(step).not.toBeNull();
    });
});
