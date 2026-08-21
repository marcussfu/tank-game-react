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
 * `obeserveImpassable`/`hitTank`/`hitPlayer`/`changeTiles` — classifies what
 * happens to a bullet AT a given cell. Shared by `tickBullet` (classifies the
 * cell the bullet is about to move into) and `checkBulletAtSpawn` (classifies
 * the cell the bullet was just created on, before it's moved at all).
 *
 * One deliberate behavior change from the DOM version: there, a bullet
 * landing on a tank/player standing on passable terrain (e.g. grass) would
 * pass straight through without stopping, because the "does this bullet
 * survive" check used the tile's pre-hit value rather than accounting for
 * the entity it just hit. That was an accident of how the original mixed a
 * return value with side effects, not an intentional rule — here, hitting a
 * tank or the player always stops the bullet.
 */
const classifyCell = (
    pos: Position,
    isPlayerBullet: boolean,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
): BulletTickOutcome => {
    if (!inBounds(pos)) return { kind: 'expired' };

    if (isPlayerBullet) {
        const tank = tanks.find(t => t.position[0] === pos[0] && t.position[1] === pos[1]);
        if (tank) return { kind: 'hitTank', position: pos, tankKeyIndex: tank.keyIndex };
    } else if (!player.hidden && player.position[0] === pos[0] && player.position[1] === pos[1]) {
        return { kind: 'hitPlayer', position: pos };
    }

    const tile = tileAt(tiles, pos);
    if (Math.round(tile) === 10) return { kind: 'hitEagle', position: pos };
    if (tile === 12) return { kind: 'hitTreasure', position: pos };
    if (tile === 5) return { kind: 'hitWall', position: pos };
    if (isImpassable(tile)) return { kind: 'expired' };
    return { kind: 'advance', position: pos };
};

/** Classifies what happens to a bullet on its next tick — the cell it's
 * about to advance into, not the one it's currently on. */
export const tickBullet = (
    bullet: BulletEntity,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
): BulletTickOutcome => {
    const nextPos = getCurrentPosition(bullet.direction, bullet.position);
    return classifyCell(nextPos, bullet.isPlayerBullet, tiles, tanks, player);
};

/**
 * Classifies a just-created bullet's own spawn cell, before it has moved.
 * Ports a DOM-version subtlety that's easy to miss when porting `tickBullet`
 * alone: bullets spawn one cell ahead of the shooter (`getCurrentPosition`
 * applied once at fire time), and bullet.component.tsx's impassability
 * effect ran on mount (dependency array `[bulletStates]`, which includes the
 * initial value) — so a bullet that spawns directly on a wall destroyed that
 * wall immediately, before its first movement tick. A `tickBullet`-only
 * implementation never evaluates a bullet's own spawn cell (only cells it's
 * about to move into), so a bullet spawned inside a wall — e.g. firing at a
 * wall from point-blank range — would silently phase through it forever,
 * never destroying it, and if something interesting (the eagle, in one
 * common map layout) sits one cell past that wall, the bullet reaches it on
 * the very next tick as if the wall were never there.
 */
export const checkBulletAtSpawn = (
    bullet: BulletEntity,
    tiles: TileGrid,
    tanks: TankEntity[],
    player: PlayerEntity,
): BulletTickOutcome => classifyCell(bullet.position, bullet.isPlayerBullet, tiles, tanks, player);
