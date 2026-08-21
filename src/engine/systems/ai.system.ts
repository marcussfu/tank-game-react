import { ENEMY_FIRE_TICK_THRESHOLD } from '../constants';
import { getCurrentPosition } from './movement.system';
import { inBounds, isImpassable, isOccupiedByPlayer, isOccupiedByTank, tileAt } from './collision.system';
import type { Direction, PlayerEntity, TankEntity, TileGrid } from '../types';

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
 * chance, or the next cell being out of bounds/impassable/occupied by
 * another tank or the player, changes direction without moving. Also blocks
 * driving onto the player's cell (bug found during M0 playtesting — the DOM
 * version never checked tank-vs-tank/tank-vs-player collision at all).
 *
 * One deliberate behavior change from the DOM version: `fireTick` now
 * accumulates every tick regardless of whether the tank actually moved. In
 * this maze-like map, a tank that gets cornered/stuck redirecting against a
 * wall could go indefinitely without ever reaching the fire threshold under
 * the original move-gated counter (found during M0 playtesting — "enemy
 * tanks often don't fire"); decoupling firing from movement success fixes
 * that while keeping the same threshold and reset-on-fire behavior.
 */
export const tickEnemyTank = (
    tank: TankEntity,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
): EnemyTickResult => {
    const random = Math.random();
    const nextPos = getCurrentPosition(tank.direction, tank.position);
    const canMove = inBounds(nextPos) && !isImpassable(tileAt(tiles, nextPos)) &&
        !isOccupiedByTank(tanks, nextPos, tank.keyIndex) && !isOccupiedByPlayer(player, nextPos);
    const shouldRedirect = random >= 0.9 || !canMove;

    const direction = shouldRedirect ? getChangeDirection() : tank.direction;
    const position = shouldRedirect ? tank.position : nextPos;

    const fireTick = tank.fireTick + 1;
    if (fireTick >= ENEMY_FIRE_TICK_THRESHOLD) {
        return { tank: { ...tank, direction, position, fireTick: 0 }, fired: true };
    }
    return { tank: { ...tank, direction, position, fireTick }, fired: false };
};
