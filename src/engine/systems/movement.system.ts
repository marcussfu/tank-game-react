import { SPRITE_SIZE } from '../constants';
import type { Direction, Position } from '../types';

/** Ports `getCurrentPosition` from config/functions.ts. */
export const getCurrentPosition = (direction: Direction | '', oldPos: Position): Position => {
    switch (direction) {
        case 'SOUTH':
            return [oldPos[0], oldPos[1] + SPRITE_SIZE];
        case 'EAST':
            return [oldPos[0] + SPRITE_SIZE, oldPos[1]];
        case 'WEST':
            return [oldPos[0] - SPRITE_SIZE, oldPos[1]];
        case 'NORTH':
            return [oldPos[0], oldPos[1] - SPRITE_SIZE];
        default:
            return [0, 0];
    }
};

/** Ports `directionToRotateDegree` from config/functions.ts. */
export const directionToRotateDegree = (direction: Direction | ''): number => {
    switch (direction) {
        case 'SOUTH':
            return 180;
        case 'EAST':
            return 90;
        case 'WEST':
            return 270;
        case 'NORTH':
            return 0;
        default:
            return 0;
    }
};
