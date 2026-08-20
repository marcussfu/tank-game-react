import {ADD_TANK, UPDATE_TANK, REMOVE_TANK, REMOVE_TANKS} from '../../config/types';
import type { Tank } from '../reducers/tankReducer';

export const setTank = (tank: Tank) => ({
    type: ADD_TANK,
    payload: tank
});

export const updateTank = (tank: Partial<Tank> & Pick<Tank, 'key_index'>) => ({
    type: UPDATE_TANK,
    payload: tank
});

export const removeTank = (key_index: Tank['key_index']) => ({
    type: REMOVE_TANK,
    payload: key_index
});

export const removeTanks = () => ({
    type: REMOVE_TANKS
});
