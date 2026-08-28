import { POWERUP_SPAWN_INTERVAL_SEC, SPRITE_SIZE } from '../constants';
import { cellsEqual, isImpassable } from './collision.system';
import type { Position, PowerupKind, TileGrid } from '../types';

export const POWERUP_KINDS: PowerupKind[] = ['invincibility', 'freeze'];

export const pickPowerupKind = (): PowerupKind =>
    POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];

/** Mirrors `shouldSpawnWave`'s cadence style: every POWERUP_SPAWN_INTERVAL_SEC
 * of level time, but not at the very start. Callers are expected to also
 * check that no powerup is already sitting uncollected on the map. */
export const shouldSpawnPowerup = (timeRemainingSec: number): boolean =>
    timeRemainingSec > 0 && timeRemainingSec % POWERUP_SPAWN_INTERVAL_SEC === 0;

/**
 * Picks a uniformly random passable, unoccupied cell for a new powerup to
 * spawn on. Enumerates every candidate cell rather than rejection-sampling
 * (mapLoader.ts's approach for the treasure tile) because a powerup's
 * candidate set can be much sparser on a wall-heavy map — rejection sampling
 * would risk looping a long time (or forever, on a fully-occupied map)
 * instead of just returning null.
 */
export const findRandomPassablePosition = (tiles: TileGrid, occupied: Position[]): Position | null => {
    const candidates: Position[] = [];
    for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
            if (isImpassable(tiles[row][col])) continue;
            const position: Position = [col * SPRITE_SIZE, row * SPRITE_SIZE];
            if (occupied.some(pos => cellsEqual(pos, position))) continue;
            candidates.push(position);
        }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
};
