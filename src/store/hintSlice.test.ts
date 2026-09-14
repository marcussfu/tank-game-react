import { describe, expect, it } from 'vitest';
import hintReducer, { hintRequested, hintReceived, hintFailed, hintReset } from './hintSlice';
import type { HintState } from './hintSlice';

describe('hintSlice', () => {
    it('starts idle with no text', () => {
        expect(hintReducer(undefined, { type: '@@INIT' })).toEqual({ status: 'idle', text: '' });
    });

    it('hintRequested moves to loading and clears any previous text', () => {
        const state: HintState = { status: 'done', text: 'OLD HINT' };
        expect(hintReducer(state, hintRequested())).toEqual({ status: 'loading', text: '' });
    });

    it('hintReceived stores the text and moves to done', () => {
        const state: HintState = { status: 'loading', text: '' };
        expect(hintReducer(state, hintReceived('WATCH THE WEST WALL.'))).toEqual({
            status: 'done', text: 'WATCH THE WEST WALL.',
        });
    });

    it('hintFailed moves to error with no text', () => {
        const state: HintState = { status: 'loading', text: '' };
        expect(hintReducer(state, hintFailed())).toEqual({ status: 'error', text: '' });
    });

    it('hintReset returns to idle', () => {
        const state: HintState = { status: 'error', text: '' };
        expect(hintReducer(state, hintReset())).toEqual({ status: 'idle', text: '' });
    });
});
