// shared domain types
export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
export type Position = [number, number];

// map action
export const ADD_TILES = 'ADD_TILES';
export const UPDATE_TILES = 'UPDATE_TILES';
// export const ADD_MAP_BULLETS = 'ADD_MAP_BULLETS';

// tank action
export const ADD_TANK = 'ADD_TANK';
export const UPDATE_TANK = 'UPDATE_TANK';
export const REMOVE_TANK = 'REMOVE_TANK';
export const REMOVE_TANKS = 'REMOVE_TANKS';

// player action
export const ADD_PLAYER = 'ADD_PLAYER';
export const HIDE_PLAYER = 'HIDE_PLAYER';
export const MOVE_PLAYER = 'MOVE_PLAYER';
export const IS_SHOOTED_PLAYER = 'IS_SHOOTED_PLAYER';
export const SET_NEW_DIR = 'SET_NEW_DIR';

// bullet action
export const ADD_BULLET = 'ADD_BULLET';
export const REMOVE_BULLET = 'REMOVE_BULLET';
export const MOVE_BULLET = 'MOVE_BULLET';
export const REMOVE_SPECIFIC_BULLET = 'REMOVE_SPECIFIC_BULLET';
export const REMOVE_UNDISPLAY_BULLET = 'REMOVE_UNDISPLAY_BULLET';

// world action
export const GAME_OVER = 'GAME_OVER';
export const GAME_WIN = 'GAME_WIN';
export const GAME_START = 'GAME_START';
export const GAME_INIT = 'GAME_INIT';
export const GAME_PAUSE = 'GAME_PAUSE';
export const SHORT_OF_TIME = 'SHORT_OF_TIME';

// setting action
export const SET_BG_VOLUME = 'SET_BG_VOLUME';
export const SET_EFFECT_VOLUME = 'SET_EFFECT_VOLUME';
