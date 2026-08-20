import {ADD_BULLET, REMOVE_BULLET, MOVE_BULLET, REMOVE_SPECIFIC_BULLET, REMOVE_UNDISPLAY_BULLET} from '../../config/types';
import type { Bullet } from '../reducers/bulletsReducer';

export const setBullet = (bullet: Bullet) => ({
    type: ADD_BULLET,
    payload: bullet
});

export const removeBullet = ()=> ({
    type: REMOVE_BULLET
});

export const moveBullet = (bullet: Bullet)=> ({
    type: MOVE_BULLET,
    payload: bullet
});

export const removeSpecificBullet = (index: Bullet['key_index'])=> ({
    type: REMOVE_SPECIFIC_BULLET,
    payload: index
});

export const removeUndisplayBullet = ()=> ({
    type: REMOVE_UNDISPLAY_BULLET
});
