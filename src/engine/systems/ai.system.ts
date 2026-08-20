import { ENEMY_FIRE_TICK_THRESHOLD } from '../constants';
import { getCurrentPosition } from './movement.system';
import { inBounds, isImpassable, tileAt } from './collision.system';
import type { Direction, TankEntity, TileGrid } from '../types';

/** Ports `getChangeDirection` from config/functions.ts — 25/25/25/25 split. */
export const getChangeDirection = (): Direction => {
    const random = Math.random();
    if (random < 0.25) return 'SOUTH';
    if (random < 0.5) return 'NORTH';
    if (random < 0.75) return 'EAST';
    return 'WEST';
};

export interface EnemyTickResult {
    tank: TankEntity;
    fired: boolean;
}

/**
 * Ports one enemy tank's `tick()` from tank.component.tsx: a 10% random
 * chance, or the next cell being out of bounds/impassable, changes direction
 * without moving and does NOT touch fireTick (it's neither incremented nor
 * reset while blocked/redirecting — matches the original exactly). Otherwise
 * the tank moves forward and fireTick accumulates; reaching the threshold
 * fires a bullet and resets the counter on that same tick.
 */
export const tickEnemyTank = (tank: TankEntity, tiles: TileGrid): EnemyTickResult => {
    const random = Math.random();
    const nextPos = getCurrentPosition(tank.direction, tank.position);
    const canMove = inBounds(nextPos) && !isImpassable(tileAt(tiles, nextPos));

    if (random >= 0.9 || !canMove) {
        return { tank: { ...tank, direction: getChangeDirection() }, fired: false };
    }

    const fireTick = tank.fireTick + 1;
    if (fireTick >= ENEMY_FIRE_TICK_THRESHOLD) {
        return { tank: { ...tank, position: nextPos, fireTick: 0 }, fired: true };
    }
    return { tank: { ...tank, position: nextPos, fireTick }, fired: false };
};
