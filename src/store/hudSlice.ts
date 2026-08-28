import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { STARTING_LIVES, TIME_LIMIT_SEC } from '../engine/constants';
import { LEVELS } from '../engine/maps/registry';

export interface HudState {
    timeRemainingSec: number;
    enemiesRemaining: number;
    levelIndex: number;
    totalLevels: number;
    /** Player 1's remaining lives. */
    lives: number;
    /** Player 2's remaining lives, or null in a solo game (HUD hides the P2 counter). */
    livesP2: number | null;
}

const initialState: HudState = {
    timeRemainingSec: TIME_LIMIT_SEC,
    enemiesRemaining: 0,
    levelIndex: 0,
    totalLevels: LEVELS.length,
    lives: STARTING_LIVES,
    livesP2: null,
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
        setLives(state, action: PayloadAction<{ playerId: number; lives: number }>) {
            if (action.payload.playerId === 0) state.lives = action.payload.lives;
            else state.livesP2 = action.payload.lives;
        },
        resetHud() {
            return initialState;
        },
    },
});

export const { setTimeRemaining, setEnemiesRemaining, setLevel, setLives, resetHud } = hudSlice.actions;
export default hudSlice.reducer;
