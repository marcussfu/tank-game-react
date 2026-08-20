import { describe, expect, it } from 'vitest';
import { isAllTanksCleared, isTimeExpired, isShortOfTime, resolveEagleHit } from './win-lose.system';
import type { TankEntity } from '../types';

describe('isAllTanksCleared', () => {
    it('is true only for an empty tanks array', () => {
        expect(isAllTanksCleared([])).toBe(true);
        const tank: TankEntity = { keyIndex: 1, position: [0, 0], direction: 'NORTH', fireTick: 0, moveTickAccumulator: 0 };
        expect(isAllTanksCleared([tank])).toBe(false);
    });
});

describe('isTimeExpired', () => {
    it('is true at and below zero', () => {
        expect(isTimeExpired(0)).toBe(true);
        expect(isTimeExpired(-1)).toBe(true);
        expect(isTimeExpired(1)).toBe(false);
    });
});

describe('isShortOfTime', () => {
    it('is true only for 18 and 19 seconds remaining', () => {
        expect(isShortOfTime(19)).toBe(true);
        expect(isShortOfTime(18)).toBe(true);
        expect(isShortOfTime(20)).toBe(false);
        expect(isShortOfTime(17)).toBe(false);
    });
});

describe('resolveEagleHit', () => {
    it('reveals the 4 flag sub-tiles at the eagle grid cells', () => {
        expect(resolveEagleHit()).toEqual([
            { cell: [22, 16], value: 11.1 },
            { cell: [22, 17], value: 11.2 },
            { cell: [23, 16], value: 11.3 },
            { cell: [23, 17], value: 11.4 },
        ]);
    });
});
