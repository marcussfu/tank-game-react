import { inBounds, isImpassable, isOccupiedByPlayers, isOccupiedByTank, tileAt } from './collision.system';
import { getCurrentPosition } from './movement.system';
import type { Direction, PlayerEntity, Position, TankEntity, TileGrid } from '../types';

const DIRECTIONS: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];

const positionKey = (pos: Position): string => `${pos[0]},${pos[1]}`;

interface QueueNode {
    pos: Position;
    firstStep: Direction;
}

/**
 * Breadth-first search over the tile grid from `start` toward the closest of
 * `targets`, treating walls/other-tanks/the-player as obstacles — the same
 * rules `tickEnemyTank`'s own `canMove` check already uses for a single
 * step. Returns the direction of the first step along a shortest path, or
 * null if none of the targets is reachable at all (callers should fall back
 * to the old random-redirect behavior in that case, so a tank never gets
 * stuck doing nothing when its target is walled off).
 *
 * A target cell itself is always accepted as a valid destination even
 * though it's normally "occupied" (by the player standing on it, or by the
 * eagle's always-impassable tile) — the goal is only ever to get the tank
 * pointed the right way for its *next single step*, which the normal
 * movement/collision check re-validates every tick anyway. Cells beyond a
 * blocked-but-not-a-target cell are still correctly excluded from the search.
 */
export const findNextStep = (
    tiles: TileGrid,
    start: Position,
    targets: Position[],
    tanks: TankEntity[],
    players: PlayerEntity[],
    selfKeyIndex: number,
): Direction | null => {
    if (targets.length === 0) return null;
    const targetKeys = new Set(targets.map(positionKey));
    if (targetKeys.has(positionKey(start))) return null;

    const visited = new Set<string>([positionKey(start)]);
    const queue: QueueNode[] = [];

    const expand = (from: Position, firstStep: Direction | null): Direction | null => {
        for (const direction of DIRECTIONS) {
            const next = getCurrentPosition(direction, from);
            if (!inBounds(next)) continue;
            const key = positionKey(next);
            if (visited.has(key)) continue;
            const step = firstStep ?? direction;
            if (targetKeys.has(key)) return step;
            if (isImpassable(tileAt(tiles, next))) continue;
            if (isOccupiedByTank(tanks, next, selfKeyIndex)) continue;
            if (isOccupiedByPlayers(players, next)) continue;
            visited.add(key);
            queue.push({ pos: next, firstStep: step });
        }
        return null;
    };

    const immediate = expand(start, null);
    if (immediate) return immediate;

    let head = 0;
    while (head < queue.length) {
        const node = queue[head++];
        const found = expand(node.pos, node.firstStep);
        if (found) return found;
    }

    return null;
};
