import { getCurrentPosition } from './movement.system';
import { inBounds, isImpassable, tileAt } from './collision.system';
import type { BulletEntity, Direction, PlayerEntity, Position, TankEntity, TileGrid } from '../types';

let bulletSequence = 0;

export const createBullet = (params: {
    position: Position;
    direction: Direction;
    isPlayerBullet: boolean;
}): BulletEntity => ({
    keyIndex: `bullet_${Date.now()}_${bulletSequence++}`,
    position: params.position,
    direction: params.direction,
    isPlayerBullet: params.isPlayerBullet,
});

export type BulletTickOutcome =
    /** Left the map, or absorbed by terrain with no further effect (rock/water/rock-cube/an already-boomed cell/a revealed flag tile). */
    | { kind: 'expired' }
    | { kind: 'advance'; position: Position }
    | { kind: 'hitTank'; position: Position; tankKeyIndex: number }
    | { kind: 'hitPlayer'; position: Position }
    | { kind: 'hitWall'; position: Position }
    | { kind: 'hitEagle'; position: Position }
    | { kind: 'hitTreasure'; position: Position };

/**
 * Ports the hit-detection/tile-effect rules from bullet.component.tsx's
 * `obeserveImpassable`/`hitTank`/`hitPlayer`/`changeTiles`, as a pure
 * function: given a bullet and the current world state, decide what happens
 * to it this tick. The caller (Engine) applies the resulting mutations
 * (removing tanks/bullets, hiding the player, changing tiles, scheduling
 * delayed reverts, emitting events).
 *
 * One deliberate behavior change from the DOM version: there, a bullet
 * landing on a tank/player standing on passable terrain (e.g. grass) would
 * pass straight through without stopping, because the "does this bullet
 * survive" check used the tile's pre-hit value rather than accounting for
 * the entity it just hit. That was an accident of how the original mixed a
 * return value with side effects, not an intentional rule — here, hitting a
 * tank or the player always stops the bullet.
 */
export const tickBullet = (
    bullet: BulletEntity,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
): BulletTickOutcome => {
    const nextPos = getCurrentPosition(bullet.direction, bullet.position);
    if (!inBounds(nextPos)) return { kind: 'expired' };

    if (bullet.isPlayerBullet) {
        const tank = tanks.find(t => t.position[0] === nextPos[0] && t.position[1] === nextPos[1]);
        if (tank) return { kind: 'hitTank', position: nextPos, tankKeyIndex: tank.keyIndex };
    } else if (!player.hidden && player.position[0] === nextPos[0] && player.position[1] === nextPos[1]) {
        return { kind: 'hitPlayer', position: nextPos };
    }

    const tile = tileAt(tiles, nextPos);
    if (Math.round(tile) === 10) return { kind: 'hitEagle', position: nextPos };
    if (tile === 12) return { kind: 'hitTreasure', position: nextPos };
    if (tile === 5) return { kind: 'hitWall', position: nextPos };
    if (isImpassable(tile)) return { kind: 'expired' };
    return { kind: 'advance', position: nextPos };
};
