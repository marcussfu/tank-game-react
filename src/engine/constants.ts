import type { GridCell, Position } from './types';
import type { Direction } from '../types/directions';

export const SPRITE_SIZE = 20;
export const MAP_WIDTH = SPRITE_SIZE * 40;
export const MAP_HEIGHT = SPRITE_SIZE * 24;

// [row, col] tile-grid indices of the eagle base's 4 sub-tiles (map_1.ts rows
// 22-23, cols 16-17 — the 10.1/10.2/10.3/10.4 cells) — grid indices, not a
// pixel Position, matching how the DOM version's `FLAG_POSITION` was indexed
// directly into `tiles[row][col]` with no SPRITE_SIZE conversion.
export const FLAG_POSITION: GridCell[] = [[22, 16], [22, 17], [23, 16], [23, 17]];

/** FLAG_POSITION converted from grid indices to pixel Positions — the shape
 * enemy-AI targeting (ai.system.ts) needs to aim at or pathfind toward the
 * eagle, since entity positions are all pixel-space elsewhere in the engine. */
export const EAGLE_TARGET_POSITIONS: Position[] = FLAG_POSITION.map(
    ([row, col]) => [col * SPRITE_SIZE, row * SPRITE_SIZE] as Position,
);

export const TIME_LIMIT_SEC = 180;

// Fixed-timestep simulation tick, matching the DOM version's finest-grained
// interval (the bullet's setInterval(tick, 50)).
export const SIM_TICK_MS = 50;

// Tanks (both enemy AI and player) move once every 4 sim ticks, matching the
// DOM version's 200ms tank/player move interval.
export const TANK_MOVE_TICKS = 4;

// Enemy fires after 5 successful movement ticks (tank.component.tsx's
// fireTick === 5 threshold).
export const ENEMY_FIRE_TICK_THRESHOLD = 5;

// Explosion sprite duration (bullet.component.tsx's releaseBoom: tile=9 for
// 100ms before reverting).
export const BOOM_DURATION_TICKS = 2;

// Treasure-hit-by-bullet reveal delay (releaseBoom's 100ms setTimeout before
// the tile becomes the star).
export const TREASURE_REVEAL_TICKS = 2;

// Eagle-destroyed / player-hit -> gameOver delay (world.component.tsx /
// bullet.component.tsx's gameOverTotal 500ms setTimeout).
export const GAME_OVER_DELAY_TICKS = 10;

// Enemy tank respawn wave cadence (timing.component.tsx: timeValue % 60 === 0).
export const SPAWN_WAVE_SEC = 60;

// shortOfTime window (timing.component.tsx: 18 <= timeValue < 20).
export const SHORT_OF_TIME_MIN_SEC = 18;
export const SHORT_OF_TIME_MAX_SEC = 20;

export const INITIAL_TANK_SPAWNS: { position: Position; direction: Direction }[] = [
    { position: [0, 0], direction: 'SOUTH' },
    { position: [780, 460], direction: 'NORTH' },
    { position: [740, 0], direction: 'WEST' },
];

export const PLAYER_START_POSITION: Position = [280, 460];
export const PLAYER_START_DIRECTION: Direction = 'NORTH';
