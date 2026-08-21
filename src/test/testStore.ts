import { configureStore } from '@reduxjs/toolkit';
import worldReducer from '../store/worldSlice';
import hudReducer from '../store/hudSlice';
import settingsReducer from '../store/settingsSlice';
import type { RootState } from '../store/store';

/** A fresh store per test, instead of importing the app's real singleton —
 * avoids state leaking between tests and lets each test preload exactly the
 * slice state it needs. */
export const makeTestStore = (preloadedState?: Partial<RootState>) =>
    configureStore({
        reducer: {
            world: worldReducer,
            hud: hudReducer,
            settings: settingsReducer,
        },
        // Tests only ever preload a subset of slices; the rest fall back to
        // each slice's own initialState via redux's normal combineReducers
        // behavior, so this cast is safe despite the Partial input.
        preloadedState: preloadedState as RootState,
    });
