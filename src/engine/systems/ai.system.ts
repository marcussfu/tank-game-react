import { ENEMY_FIRE_TICK_THRESHOLD } from '../constants';
import { getCurrentPosition } from './movement.system';
import { inBounds, isImpassable, isOccupiedByPlayer, isOccupiedByTank, tileAt } from './collision.system';
import { findAimDirection, findAnyAimDirection } from './los.system';
import { findNextStep } from './pathfinding.system';
import type { Direction, PlayerEntity, Position, TankEntity, TileGrid } from '../types';

/** Ports `getChangeDirection` from config/functions.ts — 25/25/25/25 split.
 * Kept as the fallback when no smarter option applies: neither target has a
 * clear shot, and pathfinding can't find a route to either one either (e.g.
 * fully walled in). */
export const getChangeDirection = (): Direction => {
    const random = Math.random();
    if (random < 0.25) return 'SOUTH';
    if (random < 0.5) return 'NORTH';
    if (random < 0.75) return 'EAST';
    return 'WEST';
};

/** Chance (evaluated fresh at each redirect decision) that a tank paths
 * toward the eagle instead of hunting the player — biased toward defending
 * the base, matching classic Battle City AI, while leaving room for tanks to
 * occasionally hunt the player instead. */
const EAGLE_TARGET_BIAS = 0.65;

export interface EnemyTickResult {
    tank: TankEntity;
    fired: boolean;
}

/**
 * Ports one enemy tank's `tick()` from tank.component.tsx, then layers on
 * targeting: if the tank has a clear, grid-aligned shot at the player or the
 * eagle, it turns to face that target and holds position instead of
 * wandering — converting the original's unconditional-random fire into
 * genuinely aimed fire. Firing itself is unchanged: `fireTick` still
 * accumulates every tick regardless of aim/movement and fires unconditionally
 * at `ENEMY_FIRE_TICK_THRESHOLD`, so a tank that never gets a clear shot
 * still fires on schedule exactly like before (this is what keeps the
 * original "cornered tanks still eventually fire" fix intact).
 *
 * When there's no shot available, movement falls back to the original
 * 10%-random-or-blocked redirect check, but the *new* direction on a redirect
 * now comes from a grid pathfind toward the player or the eagle (weighted by
 * EAGLE_TARGET_BIAS) instead of a flat 25/25/25/25 pick — `getChangeDirection`
 * is only used when pathfinding can't find a route to either target at all.
 */
export const tickEnemyTank = (
    tank: TankEntity,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
    eagleTargets: Position[],
): EnemyTickResult => {
    const aimDirection = player.hidden
        ? findAnyAimDirection(tiles, tank.position, eagleTargets)
        : (findAimDirection(tiles, tank.position, player.position) ??
            findAnyAimDirection(tiles, tank.position, eagleTargets));

    let direction: Direction;
    let position = tank.position;

    if (aimDirection) {
        direction = aimDirection;
    } else {
        const random = Math.random();
        const nextPos = getCurrentPosition(tank.direction, tank.position);
        const canMove = inBounds(nextPos) && !isImpassable(tileAt(tiles, nextPos)) &&
            !isOccupiedByTank(tanks, nextPos, tank.keyIndex) && !isOccupiedByPlayer(player, nextPos);
        const shouldRedirect = random >= 0.9 || !canMove;

        if (shouldRedirect) {
            const huntEagle = Math.random() < EAGLE_TARGET_BIAS;
            const targets = huntEagle ? eagleTargets : player.hidden ? [] : [player.position];
            const pathDirection = findNextStep(tiles, tank.position, targets, tanks, player, tank.keyIndex);
            direction = pathDirection ?? getChangeDirection();
        } else {
            direction = tank.direction;
            position = nextPos;
        }
    }

    const fireTick = tank.fireTick + 1;
    if (fireTick >= ENEMY_FIRE_TICK_THRESHOLD) {
        return { tank: { ...tank, direction, position, fireTick: 0 }, fired: true };
    }
    return { tank: { ...tank, direction, position, fireTick }, fired: false };
};
