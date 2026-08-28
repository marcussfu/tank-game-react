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
            livesP2: null,
        });
    });

    it('setTimeRemaining overwrites timeRemainingSec', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null };
        expect(hudReducer(state, setTimeRemaining(42))).toEqual({ ...state, timeRemainingSec: 42 });
    });

    it('setEnemiesRemaining overwrites enemiesRemaining', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null };
        expect(hudReducer(state, setEnemiesRemaining(5))).toEqual({ ...state, enemiesRemaining: 5 });
    });

    it('setLevel overwrites levelIndex and totalLevels', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null };
        expect(hudReducer(state, setLevel({ levelIndex: 1, totalLevels: 3 }))).toEqual({
            ...state,
            levelIndex: 1,
            totalLevels: 3,
        });
    });

    it('setLives updates player 1 lives for playerId 0', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null };
        expect(hudReducer(state, setLives({ playerId: 0, lives: 2 }))).toEqual({ ...state, lives: 2 });
    });

    it('setLives updates player 2 lives for playerId 1', () => {
        const state: HudState = { timeRemainingSec: 100, enemiesRemaining: 2, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: 3 };
        expect(hudReducer(state, setLives({ playerId: 1, lives: 1 }))).toEqual({ ...state, livesP2: 1 });
    });

    it('resetHud restores the initial values regardless of current state', () => {
        const state: HudState = { timeRemainingSec: 3, enemiesRemaining: 9, levelIndex: 1, totalLevels: 2, lives: 0, livesP2: 0 };
        expect(hudReducer(state, resetHud())).toEqual({
            timeRemainingSec: TIME_LIMIT_SEC,
            enemiesRemaining: 0,
            levelIndex: 0,
            totalLevels: LEVELS.length,
            lives: STARTING_LIVES,
            livesP2: null,
        });
    });
});
