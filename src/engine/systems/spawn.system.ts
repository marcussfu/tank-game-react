import { SPAWN_WAVE_SEC, TIME_LIMIT_SEC } from '../constants';
import type { Direction, Position } from '../types';

export interface TankSpawn {
    position: Position;
    direction: Direction;
}

/** Ports the 3 fixed spawn points used both at game start (world.component.tsx)
 * and for every respawn wave (timing.component.tsx's `createEnemyTank`) —
 * the DOM version duplicated this list in both places; here it's one source.
 * Takes the current level's spawn points rather than a global constant, now
 * that different levels can define their own. Returns fresh objects each
 * call so callers may freely mutate/tag the result (e.g. assigning keyIndex). */
export const getSpawnWave = (spawns: TankSpawn[]): TankSpawn[] => spawns.map(spawn => ({ ...spawn }));

/** Ports timing.component.tsx's respawn condition: `timeValue % 60 === 0 &&
 * timeValue < 180 && timeValue > 0` — i.e. every 60 seconds after the start,
 * but not at the very start (already spawned) or at/after time-out. */
export const shouldSpawnWave = (timeRemainingSec: number): boolean =>
    timeRemainingSec > 0 &&
    timeRemainingSec < TIME_LIMIT_SEC &&
    timeRemainingSec % SPAWN_WAVE_SEC === 0;
