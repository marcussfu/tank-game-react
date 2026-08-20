import {SET_BG_VOLUME, SET_EFFECT_VOLUME} from '../../config/types';

export interface SettingState {
    bgVolume: number;
    effectVolume: number;
}

interface SetBgVolumeAction {
    type: typeof SET_BG_VOLUME;
    payload: number;
}

interface SetEffectVolumeAction {
    type: typeof SET_EFFECT_VOLUME;
    payload: number;
}

type SettingAction = SetBgVolumeAction | SetEffectVolumeAction;

const intialState: SettingState = {
    bgVolume: 0.5,
    effectVolume: 0.3,
}

export const settingReducer = (state: SettingState = intialState, action: SettingAction): SettingState => {
    switch(action.type) {
        case SET_BG_VOLUME:
            return {
                ...state,
                bgVolume: action.payload
            }
        case SET_EFFECT_VOLUME:
            return {
                ...state,
                effectVolume: action.payload
            }
        default:
            return state
    }
}
