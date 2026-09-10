import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Banner {
    text: string;
    /** Bumped on every new banner so `BannerFeed` can restart its animation
     * even when the same line fires twice in a row. */
    id: number;
}

export interface FeedState {
    current: Banner | null;
}

const initialState: FeedState = { current: null };

const feedSlice = createSlice({
    name: 'feed',
    initialState,
    reducers: {
        showBanter(state, action: PayloadAction<string>) {
            state.current = { text: action.payload, id: (state.current?.id ?? 0) + 1 };
        },
        clearBanter(state) {
            state.current = null;
        },
    },
});

export const { showBanter, clearBanter } = feedSlice.actions;
export default feedSlice.reducer;
