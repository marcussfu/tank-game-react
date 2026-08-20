import { describe, expect, it } from 'vitest';
import { isImpassable, inBounds, cellsEqual, tileAt } from './collision.system';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

describe('isImpassable', () => {
    it('treats tiles below 5 as passable', () => {
        expect(isImpassable(0)).toBe(false);
        expect(isImpassable(4)).toBe(false);
    });

    it('treats tiles >= 5 as impassable, including fractional eagle/flag variants', () => {
        expect(isImpassable(5)).toBe(true);
        expect(isImpassable(9)).toBe(true);
        expect(isImpassable(10.1)).toBe(true);
        expect(isImpassable(12)).toBe(true);
    });
});

describe('inBounds', () => {
    it('accepts the map edges', () => {
        expect(inBounds([0, 0])).toBe(true);
        expect(inBounds([MAP_WIDTH - 20, MAP_HEIGHT - 20])).toBe(true);
    });

    it('rejects positions past the edges', () => {
        expect(inBounds([-20, 0])).toBe(false);
        expect(inBounds([0, -20])).toBe(false);
        expect(inBounds([MAP_WIDTH, 0])).toBe(false);
        expect(inBounds([0, MAP_HEIGHT])).toBe(false);
    });
});

describe('cellsEqual', () => {
    it('compares positions numerically', () => {
        expect(cellsEqual([20, 40], [20, 40])).toBe(true);
        expect(cellsEqual([20, 40], [20, 60])).toBe(false);
    });
});

describe('tileAt', () => {
    it('looks up the tile by dividing pixel position by sprite size', () => {
        const tiles = [
            [0, 1],
            [2, 3],
        ];
        expect(tileAt(tiles, [0, 0])).toBe(0);
        expect(tileAt(tiles, [20, 0])).toBe(1);
        expect(tileAt(tiles, [0, 20])).toBe(2);
        expect(tileAt(tiles, [20, 20])).toBe(3);
    });
});
