import { inBounds, isImpassable, tileAt } from './collision.system';
import { getCurrentPosition } from './movement.system';
import type { Direction, Position, TileGrid } from '../types';

/**
 * Returns the cardinal direction to aim from `from` toward `to` if they
 * share a row or column (grid-aligned), or null otherwise — tanks and
 * bullets only ever travel along the 4 cardinal directions, so an
 * off-axis target can never actually be hit no matter which way a tank turns.
 */
export const getAimDirection = (from: Position, to: Position): Direction | null => {
    if (from[0] === to[0] && from[1] === to[1]) return null;
    if (from[0] === to[0]) return to[1] > from[1] ? 'SOUTH' : 'NORTH';
    if (from[1] === to[1]) return to[0] > from[0] ? 'EAST' : 'WEST';
    return null;
};

/**
 * Steps cell-by-cell from `from` toward `to` along `direction` (assumed
 * already grid-aligned, e.g. via `getAimDirection`) exactly the way a bullet
 * actually travels (mirrors bullets.system.ts's `classifyCell` terrain
 * check) — so "has line of sight" means "a bullet fired now would actually
 * reach the target", not just "nothing happens to be directly between them
 * in an idealized straight line". Only checks terrain; another tank sitting
 * between the two points is not treated as blocking (a minor realism gap,
 * out of scope for this pass — bullets already resolve tank-vs-tank hits
 * correctly once fired).
 */
export const hasLineOfSight = (
    tiles: TileGrid,
    from: Position,
    to: Position,
    direction: Direction,
): boolean => {
    let pos = from;
    for (;;) {
        pos = getCurrentPosition(direction, pos);
        if (!inBounds(pos)) return false;
        if (pos[0] === to[0] && pos[1] === to[1]) return true;
        if (isImpassable(tileAt(tiles, pos))) return false;
    }
};

/** Combines the two checks above: is there a direction a tank at `from`
 * could turn to right now and get a clear shot at `to`? */
export const findAimDirection = (tiles: TileGrid, from: Position, to: Position): Direction | null => {
    const direction = getAimDirection(from, to);
    if (!direction) return null;
    return hasLineOfSight(tiles, from, to, direction) ? direction : null;
};

/** Same as `findAimDirection`, but against a list of candidate target cells
 * (e.g. the eagle's 4 sub-tiles) — returns the first one with a clear shot. */
export const findAnyAimDirection = (tiles: TileGrid, from: Position, targets: Position[]): Direction | null => {
    for (const target of targets) {
        const direction = findAimDirection(tiles, from, target);
        if (direction) return direction;
    }
    return null;
};
