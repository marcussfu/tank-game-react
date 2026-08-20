import { INITIAL_TANK_SPAWNS, SPAWN_WAVE_SEC, TIME_LIMIT_SEC } from '../constants';
import type { Direction, Position } from '../types';

export interface TankSpawn {
    position: Position;
    direction: Direction;
}

/** Ports the 3 fixed spawn points used both at game start (world.component.tsx)
 * and for every respawn wave (timing.component.tsx's `createEnemyTank`) —
 * the DOM version duplicated this list in both places; here it's one source. */
export const getSpawnWave = (): TankSpawn[] => INITIAL_TANK_SPAWNS.map(spawn => ({ ...spawn }));

/** Ports timing.component.tsx's respawn condition: `timeValue % 60 === 0 &&
 * timeValue < 180 && timeValue > 0` — i.e. every 60 seconds after the start,
 * but not at the very start (already spawned) or at/after time-out. */
export const shouldSpawnWave = (timeRemainingSec: number): boolean =>
    timeRemainingSec > 0 &&
    timeRemainingSec < TIME_LIMIT_SEC &&
    timeRemainingSec % SPAWN_WAVE_SEC === 0;
