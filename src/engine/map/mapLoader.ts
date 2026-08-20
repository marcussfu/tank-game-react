import type { TileGrid } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, SPRITE_SIZE } from '../constants';

const WALL_TILE = 5;
const TREASURE_TILE = 12;
const MAP_ROWS = MAP_HEIGHT / SPRITE_SIZE;
const MAP_COLS = MAP_WIDTH / SPRITE_SIZE;

/**
 * Picks a random wall tile (value 5) and turns it into a treasure tile (12).
 * Ports `setupTiles` from config/functions.ts verbatim: same rejection-sampling
 * approach (keep rerolling a random cell until it lands on a wall tile).
 */
export const setupTiles = (source: TileGrid): TileGrid => {
    const tiles = source.map(row => row.slice());

    let row = Math.round(Math.random() * (MAP_ROWS - 1));
    let col = Math.round(Math.random() * (MAP_COLS - 1));
    while (tiles[row][col] !== WALL_TILE) {
        row = Math.round(Math.random() * (MAP_ROWS - 1));
        col = Math.round(Math.random() * (MAP_COLS - 1));
    }
    tiles[row][col] = TREASURE_TILE;

    return tiles;
};
