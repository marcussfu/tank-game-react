import { describe, expect, it } from 'vitest';
import settingsReducer, { setBgVolume, setEffectVolume } from './settingsSlice';
import type { SettingsState } from './settingsSlice';

describe('settingsSlice', () => {
    it('has the expected initial state', () => {
        expect(settingsReducer(undefined, { type: '@@INIT' })).toEqual({
            bgVolume: 0.5,
            effectVolume: 0.3,
        });
    });

    it('setBgVolume overwrites bgVolume without touching effectVolume', () => {
        const state: SettingsState = { bgVolume: 0.5, effectVolume: 0.3 };
        expect(settingsReducer(state, setBgVolume(0.9))).toEqual({ bgVolume: 0.9, effectVolume: 0.3 });
    });

    it('setEffectVolume overwrites effectVolume without touching bgVolume', () => {
        const state: SettingsState = { bgVolume: 0.5, effectVolume: 0.3 };
        expect(settingsReducer(state, setEffectVolume(0.1))).toEqual({ bgVolume: 0.5, effectVolume: 0.1 });
    });
});
