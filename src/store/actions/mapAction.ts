import {ADD_TILES, UPDATE_TILES} from '../../config/types';

export const setTiles = (tiles: number[][]) => ({
    type: ADD_TILES,
    payload: tiles
});

export const updateTiles = (tiles: number[][])=> ({
    type: UPDATE_TILES,
    payload: tiles
});
