import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type HintStatus = 'idle' | 'loading' | 'done' | 'error';

export interface HintState {
    status: HintStatus;
    text: string;
}

const initialState: HintState = { status: 'idle', text: '' };

const hintSlice = createSlice({
    name: 'hint',
    initialState,
    reducers: {
        hintRequested(state) {
            state.status = 'loading';
            state.text = '';
        },
        hintReceived(state, action: PayloadAction<string>) {
            state.status = 'done';
            state.text = action.payload;
        },
        hintFailed(state) {
            state.status = 'error';
            state.text = '';
        },
        hintReset() {
            return initialState;
        },
    },
});

export const { hintRequested, hintReceived, hintFailed, hintReset } = hintSlice.actions;
export default hintSlice.reducer;
