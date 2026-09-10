import { configureStore } from '@reduxjs/toolkit';

import worldReducer from './worldSlice';
import hudReducer from './hudSlice';
import settingsReducer from './settingsSlice';
import feedReducer from '../game-feed/feedSlice';

const store = configureStore({
    reducer: {
        world: worldReducer,
        hud: hudReducer,
        settings: settingsReducer,
        feed: feedReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
