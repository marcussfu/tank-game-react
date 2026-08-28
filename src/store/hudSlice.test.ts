import { describe, expect, it } from 'vitest';
import hudReducer, { setTimeRemaining, setEnemiesRemaining, setLevel, setLives, resetHud } from './hudSlice';
import { STARTING_LIVES, TIME_LIMIT_SEC } from '../engine/constants';
import { LEVELS } from '../engine/maps/registry';
import type { HudState } from './hudSlice';

describe('hudSlice', () => {
    it('has the expected initial state', () => {
        expect(hudReducer(undefined, { type: '@@INIT' })).toEqual({
            timeRemainingSec: TIME_LIMIT_SEC,
            enemiesRemaining: 0,
            levelIndex: 0,
            totalLevels: LEVELS.length,
            lives: STARTING_LIVES,
        });
    });

    it('setTimeRemaining overwrites timeRemainingSec', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3 };
        expect(hudReducer(state, setTimeRemaining(42))).toEqual({ ...state, timeRemainingSec: 42 });
    });

    it('setEnemiesRemaining overwrites enemiesRemaining', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3 };
        expect(hudReducer(state, setEnemiesRemaining(5))).toEqual({ ...state, enemiesRemaining: 5 });
    });

    it('setLevel overwrites levelIndex and totalLevels', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3 };
        expect(hudReducer(state, setLevel({ levelIndex: 1, totalLevels: 3 }))).toEqual({
            ...state,
            levelIndex: 1,
            totalLevels: 3,
        });
    });

    it('setLives overwrites lives', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3 };
        expect(hudReducer(state, setLives(2))).toEqual({ ...state, lives: 2 });
    });

    it('resetHud restores the initial values regardless of current state', () => {
        const state: HudState = { timeRemainingSec: 3, enemiesRemaining: 9, levelIndex: 1, totalLevels: 2, lives: 0 };
        expect(hudReducer(state, resetHud())).toEqual({
            timeRemainingSec: TIME_LIMIT_SEC,
            enemiesRemaining: 0,
            levelIndex: 0,
            totalLevels: LEVELS.length,
            lives: STARTING_LIVES,
        });
    });
});
