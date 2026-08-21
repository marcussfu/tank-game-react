import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Replaces the DOM version's 4 independent booleans (game_start/game_over/
// game_win/game_pause — a combination that could represent nonsensical
// states) with a single enum, per the plan's decision. As a side effect this
// makes the `shot_of_time`/`short_of_time` spelling-mismatch bug (#4)
// structurally impossible: there's exactly one `shortOfTime` field, typed.
export type WorldStatus = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface WorldState {
    status: WorldStatus;
    shortOfTime: boolean;
}

const initialState: WorldState = {
    status: 'menu',
    shortOfTime: false,
};

const worldSlice = createSlice({
    name: 'world',
    initialState,
    reducers: {
        setStatus(state, action: PayloadAction<WorldStatus>) {
            state.status = action.payload;
        },
        setShortOfTime(state, action: PayloadAction<boolean>) {
            state.shortOfTime = action.payload;
        },
    },
});

export const { setStatus, setShortOfTime } = worldSlice.actions;
export default worldSlice.reducer;
