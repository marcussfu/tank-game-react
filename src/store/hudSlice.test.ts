import { describe, expect, it } from 'vitest';
import hudReducer, { setTimeRemaining, setEnemiesRemaining, resetHud } from './hudSlice';
import { TIME_LIMIT_SEC } from '../engine/constants';
import type { HudState } from './hudSlice';

describe('hudSlice', () => {
    it('has the expected initial state', () => {
        expect(hudReducer(undefined, { type: '@@INIT' })).toEqual({
            timeRemainingSec: TIME_LIMIT_SEC,
            enemiesRemaining: 0,
        });
    });

    it('setTimeRemaining overwrites timeRemainingSec', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2 };
        expect(hudReducer(state, setTimeRemaining(42))).toEqual({ timeRemainingSec: 42, enemiesRemaining: 2 });
    });

    it('setEnemiesRemaining overwrites enemiesRemaining', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2 };
        expect(hudReducer(state, setEnemiesRemaining(5))).toEqual({ timeRemainingSec: 100, enemiesRemaining: 5 });
    });

    it('resetHud restores the initial values regardless of current state', () => {
        const state: HudState = { timeRemainingSec: 3, enemiesRemaining: 9 };
        expect(hudReducer(state, resetHud())).toEqual({
            timeRemainingSec: TIME_LIMIT_SEC,
            enemiesRemaining: 0,
        });
    });
});
