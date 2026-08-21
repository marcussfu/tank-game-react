import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { TIME_LIMIT_SEC } from '../engine/constants';

export interface HudState {
    timeRemainingSec: number;
    enemiesRemaining: number;
}

const initialState: HudState = {
    timeRemainingSec: TIME_LIMIT_SEC,
    enemiesRemaining: 0,
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
        resetHud() {
            return initialState;
        },
    },
});

export const { setTimeRemaining, setEnemiesRemaining, resetHud } = hudSlice.actions;
export default hudSlice.reducer;
