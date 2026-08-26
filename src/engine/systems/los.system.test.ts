import { describe, expect, it } from 'vitest';
import { findAimDirection, findAnyAimDirection, getAimDirection, hasLineOfSight } from './los.system';
import type { TileGrid } from '../types';

const openTiles: TileGrid = Array.from({ length: 24 }, () => Array(40).fill(0));

describe('getAimDirection', () => {
    it('returns SOUTH when the target is further along the same column (larger y)', () => {
        expect(getAimDirection([100, 100], [100, 300])).toBe('SOUTH');
    });

    it('returns NORTH when the target is earlier along the same column (smaller y)', () => {
        expect(getAimDirection([100, 300], [100, 100])).toBe('NORTH');
    });

    it('returns EAST when the target is further along the same row (larger x)', () => {
        expect(getAimDirection([100, 100], [300, 100])).toBe('EAST');
    });

    it('returns WEST when the target is earlier along the same row (smaller x)', () => {
        expect(getAimDirection([300, 100], [100, 100])).toBe('WEST');
    });

    it('returns null when neither row nor column line up', () => {
        expect(getAimDirection([100, 100], [300, 300])).toBeNull();
    });

    it('returns null for the same position', () => {
        expect(getAimDirection([100, 100], [100, 100])).toBeNull();
    });
});

describe('hasLineOfSight', () => {
    it('is true along an unobstructed straight line', () => {
        expect(hasLineOfSight(openTiles, [100, 100], [100, 300], 'SOUTH')).toBe(true);
    });

    it('is false when a wall sits between the two points', () => {
        const tiles: TileGrid = openTiles.map(row => row.slice());
        tiles[10][5] = 5; // pixel (100, 200), between (100,100) and (100,300)
        expect(hasLineOfSight(tiles, [100, 100], [100, 300], 'SOUTH')).toBe(false);
    });

    it('is false once the ray leaves the map bounds before reaching the target', () => {
        expect(hasLineOfSight(openTiles, [100, 100], [100, -100], 'NORTH')).toBe(false);
    });
});

describe('findAimDirection', () => {
    it('returns the aim direction when aligned and clear', () => {
        expect(findAimDirection(openTiles, [100, 100], [100, 300])).toBe('SOUTH');
    });

    it('returns null when aligned but blocked', () => {
        const tiles: TileGrid = openTiles.map(row => row.slice());
        tiles[10][5] = 5;
        expect(findAimDirection(tiles, [100, 100], [100, 300])).toBeNull();
    });

    it('returns null when off-axis regardless of terrain', () => {
        expect(findAimDirection(openTiles, [100, 100], [300, 300])).toBeNull();
    });
});

describe('findAnyAimDirection', () => {
    it('returns the direction for the first reachable candidate', () => {
        const targets: [number, number][] = [[300, 300], [100, 300], [100, 500]];
        expect(findAnyAimDirection(openTiles, [100, 100], targets)).toBe('SOUTH');
    });

    it('returns null when none of the candidates are aligned or clear', () => {
        const tiles: TileGrid = openTiles.map(row => row.slice());
        tiles[10][5] = 5;
        const targets: [number, number][] = [[300, 300], [100, 300]];
        expect(findAnyAimDirection(tiles, [100, 100], targets)).toBeNull();
    });
});
