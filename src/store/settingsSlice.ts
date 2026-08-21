import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
    bgVolume: number;
    effectVolume: number;
}

const initialState: SettingsState = {
    bgVolume: 0.5,
    effectVolume: 0.3,
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setBgVolume(state, action: PayloadAction<number>) {
            state.bgVolume = action.payload;
        },
        setEffectVolume(state, action: PayloadAction<number>) {
            state.effectVolume = action.payload;
        },
    },
});

export const { setBgVolume, setEffectVolume } = settingsSlice.actions;
export default settingsSlice.reducer;
