import { describe, expect, it } from 'vitest';
import { getSpawnWave, shouldSpawnWave } from './spawn.system';

describe('getSpawnWave', () => {
    const spawns: { position: [number, number]; direction: 'SOUTH' | 'NORTH' | 'WEST' }[] = [
        { position: [0, 0], direction: 'SOUTH' },
        { position: [780, 460], direction: 'NORTH' },
        { position: [740, 0], direction: 'WEST' },
    ];

    it('returns the given spawn points unchanged', () => {
        expect(getSpawnWave(spawns)).toEqual(spawns);
    });

    it('returns fresh objects each call (callers may freely mutate)', () => {
        const a = getSpawnWave(spawns);
        const b = getSpawnWave(spawns);
        expect(a).not.toBe(b);
        expect(a[0]).not.toBe(b[0]);
    });
});

describe('shouldSpawnWave', () => {
    it('is false at the very start (already spawned via getSpawnWave at init)', () => {
        expect(shouldSpawnWave(180)).toBe(false);
    });

    it('is true every 60 seconds after the start', () => {
        expect(shouldSpawnWave(120)).toBe(true);
        expect(shouldSpawnWave(60)).toBe(true);
    });

    it('is false at time-out and for non-multiples of 60', () => {
        expect(shouldSpawnWave(0)).toBe(false);
        expect(shouldSpawnWave(90)).toBe(false);
    });
});
