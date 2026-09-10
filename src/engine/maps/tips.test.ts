import { describe, expect, it } from 'vitest';
import { TIPS, tipFor } from './tips';
import { LEVELS } from './registry';

describe('level tips', () => {
    it('has exactly one tip per level', () => {
        expect(TIPS).toHaveLength(LEVELS.length);
    });

    it('every tip is a non-empty ALL-CAPS sentence', () => {
        for (const tip of TIPS) {
            expect(tip.trim().length).toBeGreaterThan(0);
            expect(tip).toBe(tip.toUpperCase());
        }
    });

    it('tipFor returns the tip by index and "" out of range', () => {
        expect(tipFor(0)).toBe(TIPS[0]);
        expect(tipFor(LEVELS.length)).toBe('');
        expect(tipFor(-1)).toBe('');
    });
});
