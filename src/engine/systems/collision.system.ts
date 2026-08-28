import { MAP_WIDTH, MAP_HEIGHT, SPRITE_SIZE } from '../constants';
import { IMPASSABLE_THRESHOLD } from '../map/tileTypes';
import type { GridCell, PlayerEntity, Position, TankEntity, TileGrid } from '../types';

/** Single source of truth for "is this tile value impassable", replacing the
 * three duplicated `obeserveImpassable` implementations in tank/bullet/player
 * components (all of which independently checked `tile >= 5`). */
export const isImpassable = (tile: number): boolean => tile >= IMPASSABLE_THRESHOLD;

/** Ports `obeserveBoundaries` from config/functions.ts. */
export const inBounds = (pos: Position): boolean =>
    pos[0] >= 0 && pos[0] <= MAP_WIDTH - SPRITE_SIZE &&
    pos[1] >= 0 && pos[1] <= MAP_HEIGHT - SPRITE_SIZE;

/** Replaces the DOM version's `JSON.stringify(a) === JSON.stringify(b)`
 * position-equality checks with a plain numeric comparison. */
export const cellsEqual = (a: Position, b: Position): boolean =>
    a[0] === b[0] && a[1] === b[1];

/** Converts a pixel Position into [row, col] tile-grid indices. */
export const toGridCell = (pos: Position): GridCell => [pos[1] / SPRITE_SIZE, pos[0] / SPRITE_SIZE];

export const tileAt = (tiles: TileGrid, pos: Position): number => {
    const [row, col] = toGridCell(pos);
    return tiles[row][col];
};

/** Ports the tank-on-tank/tank-on-player collision the DOM version never had
 * (player.component.jsx never referenced tank positions at all, so driving
 * into an enemy tank silently did nothing) — treats an occupied cell as
 * impassable, the same as a wall. `excludeKeyIndex` lets a tank check the
 * cell it's about to move into without matching itself. */
export const isOccupiedByTank = (tanks: TankEntity[], pos: Position, excludeKeyIndex?: number): boolean =>
    tanks.some(t => t.keyIndex !== excludeKeyIndex && cellsEqual(t.position, pos));

/** True if any visible player occupies `pos` — an enemy tank treats a player's
 * cell as impassable, same as a wall. Takes the whole player list so 2-player
 * co-op works; `excludeId` lets a player check the cell it's moving into
 * without matching itself. */
export const isOccupiedByPlayers = (players: PlayerEntity[], pos: Position, excludeId?: number): boolean =>
    players.some(p => p.id !== excludeId && !p.hidden && cellsEqual(p.position, pos));
