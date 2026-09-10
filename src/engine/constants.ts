import type { GridCell, Position } from './types';

export const SPRITE_SIZE = 20;
export const MAP_WIDTH = SPRITE_SIZE * 40;
export const MAP_HEIGHT = SPRITE_SIZE * 24;

/** Converts [row, col] tile-grid indices (how map data like a
 * `LevelDefinition`'s `flagPosition` is authored) into pixel Positions (how
 * every entity elsewhere in the engine is positioned) — e.g. so enemy-AI
 * targeting (ai.system.ts) can aim at or pathfind toward the eagle. */
export const gridCellsToPositions = (cells: GridCell[]): Position[] =>
    cells.map(([row, col]) => [col * SPRITE_SIZE, row * SPRITE_SIZE]);

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

// Player lives: a hit no longer ends the run immediately, it respawns the
// player and decrements this until it reaches 0.
export const STARTING_LIVES = 3;

// A powerup spawns every 30s of level time (mirrors SPAWN_WAVE_SEC's cadence
// style), skipped whenever one is already sitting on the map uncollected.
export const POWERUP_SPAWN_INTERVAL_SEC = 30;

// How long the invincibility/freeze effects last once picked up.
export const INVINCIBILITY_DURATION_TICKS = 100; // 5s at SIM_TICK_MS=50
export const FREEZE_DURATION_TICKS = 60; // 3s

// Run score: points per enemy tank, a flat per-level-clear bonus, and a
// per-remaining-second time bonus applied when a level is won.
export const SCORE_PER_TANK = 100;
export const SCORE_LEVEL_CLEAR = 500;
export const SCORE_TIME_BONUS_PER_SEC = 5;
