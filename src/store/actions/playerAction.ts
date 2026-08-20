import {ADD_PLAYER, HIDE_PLAYER, MOVE_PLAYER, IS_SHOOTED_PLAYER, SET_NEW_DIR} from '../../config/types';
import type { Direction } from '../../config/types';
import type { PlayerState } from '../reducers/playerReducer';

export const addPlayer = (player: Partial<PlayerState>) => ({
    type: ADD_PLAYER,
    payload: player
});

export const movePlayer = (player: Partial<PlayerState>) => ({
    type: MOVE_PLAYER,
    payload: player
});

// NOTE: hidden is intentionally optional here (not just typed as boolean) to
// faithfully preserve an existing call site (bullet.component's hitPlayer())
// that calls hidePlayer() with zero arguments, which dispatches payload:
// undefined and leaves the player visible after being "hit" (bug #5 in the
// rewrite plan). Fixing that call site is out of scope for M0.
export const hidePlayer = (hidden?: boolean) => ({
    type: HIDE_PLAYER,
    payload: hidden
});

export const isShootedPlayer = (isShooted: boolean) => ({
    type: IS_SHOOTED_PLAYER,
    payload: isShooted
});

export const setNewDir = (direction: Direction | '') => ({
    type: SET_NEW_DIR,
    payload: direction
});
