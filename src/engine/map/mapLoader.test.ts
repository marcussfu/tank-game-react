import { describe, expect, it, vi, afterEach } from 'vitest';
import { setupTiles } from './mapLoader';
import type { TileGrid } from '../types';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('setupTiles', () => {
    it('places exactly one treasure tile, only on a cell that was a wall', () => {
        const source: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));
        source[3][7] = 5; // the only wall cell, so the reroll loop must land here

        const result = setupTiles(source);

        let treasureCount = 0;
        for (let row = 0; row < 24; row++) {
            for (let col = 0; col < 40; col++) {
                if (result[row][col] === 12) {
                    treasureCount++;
                    expect([row, col]).toEqual([3, 7]);
                }
            }
        }
        expect(treasureCount).toBe(1);
    });

    it('does not mutate the source grid', () => {
        const source: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));
        source[0][0] = 5;
        const before = source.map(row => row.slice());
        setupTiles(source);
        expect(source).toEqual(before);
    });

    it('rerolls until it lands on a wall tile', () => {
        const source: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));
        source[10][20] = 5;

        // First few rerolls miss (land on non-wall cells), then hit.
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.01).mockReturnValueOnce(0.01) // row 0, col 0 -> miss
            .mockReturnValueOnce(0.5).mockReturnValueOnce(0.01) // row 12 (round(0.5*23)=12), col 0 -> miss
            .mockReturnValueOnce(10 / 23).mockReturnValueOnce(20 / 39); // row 10, col 20 -> hit

        const result = setupTiles(source);
        expect(result[10][20]).toBe(12);
    });
});
