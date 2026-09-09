import { describe, expect, it } from 'vitest';
import feedReducer, { showBanter, clearBanter } from './feedSlice';
import type { FeedState } from './feedSlice';

describe('feedSlice', () => {
    it('starts with no banner', () => {
        expect(feedReducer(undefined, { type: '@@INIT' })).toEqual({ current: null });
    });

    it('showBanter sets the text and starts the id at 1', () => {
        expect(feedReducer({ current: null }, showBanter('TANK DOWN!'))).toEqual({
            current: { text: 'TANK DOWN!', id: 1 },
        });
    });

    it('showBanter bumps the id each time, even for the same text', () => {
        let state: FeedState = { current: null };
        state = feedReducer(state, showBanter('BOOM!'));
        state = feedReducer(state, showBanter('BOOM!'));
        expect(state.current).toEqual({ text: 'BOOM!', id: 2 });
    });

    it('clearBanter removes the current banner', () => {
        expect(feedReducer({ current: { text: 'X', id: 3 } }, clearBanter())).toEqual({ current: null });
    });
});
