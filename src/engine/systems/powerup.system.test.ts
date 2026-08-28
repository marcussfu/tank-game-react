import { afterEach, describe, expect, it, vi } from 'vitest';
import { POWERUP_KINDS, findRandomPassablePosition, pickPowerupKind, shouldSpawnPowerup } from './powerup.system';
import type { Position, TileGrid } from '../types';

const openTiles: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));

afterEach(() => {
    vi.restoreAllMocks();
});

describe('pickPowerupKind', () => {
    it('always returns one of the known kinds', () => {
        for (let i = 0; i < 20; i++) {
            expect(POWERUP_KINDS).toContain(pickPowerupKind());
        }
    });

    it('picks the first kind when random is 0, and the last when just under 1', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(pickPowerupKind()).toBe(POWERUP_KINDS[0]);

        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        expect(pickPowerupKind()).toBe(POWERUP_KINDS[POWERUP_KINDS.length - 1]);
    });
});

describe('shouldSpawnPowerup', () => {
    it('is true on multiples of the spawn interval, but not at time 0', () => {
        expect(shouldSpawnPowerup(30)).toBe(true);
        expect(shouldSpawnPowerup(60)).toBe(true);
        expect(shouldSpawnPowerup(0)).toBe(false);
    });

    it('is false for non-multiples', () => {
        expect(shouldSpawnPowerup(45)).toBe(false);
    });
});

describe('findRandomPassablePosition', () => {
    it('returns null when every cell is occupied or impassable', () => {
        const tiles: TileGrid = [[5, 5], [5, 5]];
        expect(findRandomPassablePosition(tiles, [])).toBeNull();
    });

    it('returns the only viable cell when there is exactly one', () => {
        const tiles: TileGrid = [[5, 5], [5, 0]];
        expect(findRandomPassablePosition(tiles, [])).toEqual([20, 20]); // row 1, col 1
    });

    it('never returns a cell listed as occupied', () => {
        const occupied: Position[] = [];
        for (let row = 0; row < openTiles.length; row++) {
            for (let col = 0; col < openTiles[row].length; col++) {
                if (row === 5 && col === 5) continue; // leave exactly one cell free
                occupied.push([col * 20, row * 20]);
            }
        }
        expect(findRandomPassablePosition(openTiles, occupied)).toEqual([100, 100]);
    });

    it('treats impassable tiles as unavailable regardless of occupancy', () => {
        const tiles: TileGrid = [[5, 0]];
        expect(findRandomPassablePosition(tiles, [])).toEqual([20, 0]); // only the grass cell
    });
});
