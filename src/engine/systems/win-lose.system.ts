import { FLAG_POSITION, SHORT_OF_TIME_MAX_SEC, SHORT_OF_TIME_MIN_SEC } from '../constants';
import type { GridCell, TankEntity } from '../types';

/** Ports bullet.component.tsx's win check after removing a tank: `tanks.length <= 0`. */
export const isAllTanksCleared = (tanks: TankEntity[]): boolean => tanks.length === 0;

/** Ports timing.component.tsx's `timeValue < 1` lose condition. */
export const isTimeExpired = (timeRemainingSec: number): boolean => timeRemainingSec <= 0;

/** Ports timing.component.tsx's `timeValue < 20 && timeValue >= 18` window. */
export const isShortOfTime = (timeRemainingSec: number): boolean =>
    timeRemainingSec >= SHORT_OF_TIME_MIN_SEC && timeRemainingSec < SHORT_OF_TIME_MAX_SEC;

export interface FlagReveal {
    cell: GridCell;
    value: number;
}

/** Ports bullet.component.tsx's eagle-hit tile swap:
 * `FLAG_POSITION.map((row, index) => tiles[row[0]][row[1]] = 11 + 0.1*(index+1))`. */
export const resolveEagleHit = (): FlagReveal[] =>
    FLAG_POSITION.map((cell, index) => ({ cell, value: 11 + 0.1 * (index + 1) }));
