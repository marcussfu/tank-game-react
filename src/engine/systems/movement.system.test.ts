import { describe, expect, it } from 'vitest';
import { getCurrentPosition, directionToRotateDegree } from './movement.system';

describe('getCurrentPosition', () => {
    it('moves south by one sprite cell', () => {
        expect(getCurrentPosition('SOUTH', [100, 100])).toEqual([100, 120]);
    });

    it('moves north by one sprite cell', () => {
        expect(getCurrentPosition('NORTH', [100, 100])).toEqual([100, 80]);
    });

    it('moves east by one sprite cell', () => {
        expect(getCurrentPosition('EAST', [100, 100])).toEqual([120, 100]);
    });

    it('moves west by one sprite cell', () => {
        expect(getCurrentPosition('WEST', [100, 100])).toEqual([80, 100]);
    });

    it('returns the origin for an empty direction', () => {
        expect(getCurrentPosition('', [100, 100])).toEqual([0, 0]);
    });
});

describe('directionToRotateDegree', () => {
    it.each([
        ['NORTH', 0],
        ['EAST', 90],
        ['SOUTH', 180],
        ['WEST', 270],
        ['', 0],
    ] as const)('%s -> %i degrees', (direction, degrees) => {
        expect(directionToRotateDegree(direction)).toBe(degrees);
    });
});
