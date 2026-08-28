import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { STARTING_LIVES, TIME_LIMIT_SEC } from '../engine/constants';
import { LEVELS } from '../engine/maps/registry';

export interface HudState {
    timeRemainingSec: number;
    enemiesRemaining: number;
    levelIndex: number;
    totalLevels: number;
    lives: number;
}

const initialState: HudState = {
    timeRemainingSec: TIME_LIMIT_SEC,
    enemiesRemaining: 0,
    levelIndex: 0,
    totalLevels: LEVELS.length,
    lives: STARTING_LIVES,
};

const hudSlice = createSlice({
    name: 'hud',
    initialState,
    reducers: {
        setTimeRemaining(state, action: PayloadAction<number>) {
            state.timeRemainingSec = action.payload;
        },
        setEnemiesRemaining(state, action: PayloadAction<number>) {
            state.enemiesRemaining = action.payload;
        },
        setLevel(state, action: PayloadAction<{ levelIndex: number; totalLevels: number }>) {
            state.levelIndex = action.payload.levelIndex;
            state.totalLevels = action.payload.totalLevels;
        },
        setLives(state, action: PayloadAction<number>) {
            state.lives = action.payload;
        },
        resetHud() {
            return initialState;
        },
    },
});

export const { setTimeRemaining, setEnemiesRemaining, setLevel, setLives, resetHud } = hudSlice.actions;
export default hudSlice.reducer;
