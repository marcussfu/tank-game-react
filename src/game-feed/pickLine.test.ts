import { describe, expect, it } from 'vitest';
import { makePicker } from './pickLine';

describe('makePicker', () => {
    const pools = { kill: ['A', 'B', 'C'], empty: [] as string[] };

    it('hands out every line in a category once before repeating', () => {
        const pick = makePicker(pools);
        const first = [pick('kill'), pick('kill'), pick('kill')];
        expect([...first].sort()).toEqual(['A', 'B', 'C']); // all three, some order
    });

    it('starts a fresh shuffled bag after the pool is exhausted', () => {
        const pick = makePicker(pools);
        pick('kill'); pick('kill'); pick('kill'); // drain
        const fourth = pick('kill');
        expect(['A', 'B', 'C']).toContain(fourth); // a real line, not null
    });

    it('returns null for an unknown category', () => {
        expect(makePicker(pools)('nope')).toBeNull();
    });

    it('returns null for an empty category', () => {
        expect(makePicker(pools)('empty')).toBeNull();
    });
});
