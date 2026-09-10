import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlayerKey, getLastName, setLastName } from './playerKey';

describe('playerKey', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.unstubAllGlobals());

    it('creates a key once and returns the same one after', () => {
        const first = getPlayerKey();
        expect(first).toMatch(/[0-9a-f-]{10,}/);
        expect(getPlayerKey()).toBe(first);
    });

    it('falls back to a volatile id when localStorage throws', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
        });
        expect(getPlayerKey()).toBe('anon');
    });

    it('round-trips the last-used name', () => {
        expect(getLastName()).toBe('');
        setLastName('ACE');
        expect(getLastName()).toBe('ACE');
    });
});
