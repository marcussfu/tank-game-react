import {SET_BG_VOLUME, SET_EFFECT_VOLUME} from '../../config/types';

export const setBgVolume = (value: number) => ({
    type: SET_BG_VOLUME,
    payload: value
});

export const setEffectVolume = (value: number)=> ({
    type: SET_EFFECT_VOLUME,
    payload: value
});
