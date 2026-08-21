import { describe, expect, it } from 'vitest';
import worldReducer, { setStatus, setShortOfTime } from './worldSlice';
import type { WorldState } from './worldSlice';

describe('worldSlice', () => {
    it('has the expected initial state', () => {
        expect(worldReducer(undefined, { type: '@@INIT' })).toEqual({
            status: 'menu',
            shortOfTime: false,
        });
    });

    it('setStatus overwrites status without touching shortOfTime', () => {
        const state: WorldState = { status: 'menu', shortOfTime: true };
        expect(worldReducer(state, setStatus('playing'))).toEqual({ status: 'playing', shortOfTime: true });
    });

    it('setShortOfTime overwrites shortOfTime without touching status', () => {
        const state: WorldState = { status: 'playing', shortOfTime: false };
        expect(worldReducer(state, setShortOfTime(true))).toEqual({ status: 'playing', shortOfTime: true });
    });
});
