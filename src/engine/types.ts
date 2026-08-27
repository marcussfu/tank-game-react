import type { Direction } from '../types/directions';

export type { Direction };
/** Pixel coordinates, [x, y] — always a multiple of SPRITE_SIZE. */
export type Position = [number, number];
/** Tile-grid indices, [row, col] — distinct from pixel `Position` even though
 * both are `[number, number]` tuples; mixing them up is an easy mistake since
 * the underlying map data (e.g. FLAG_POSITION) is authored in grid indices. */
export type GridCell = [number, number];
export type TileGrid = number[][];

export interface TankEntity {
    keyIndex: number;
    position: Position;
    direction: Direction;
    /** Ticks accumulated since the last successful move; fires at ENEMY_FIRE_TICK_THRESHOLD. */
    fireTick: number;
    /** Sim ticks elapsed since this tank last processed a move (gates the 4-tick move cadence). */
    moveTickAccumulator: number;
}

export interface BulletEntity {
    keyIndex: string;
    position: Position;
    direction: Direction;
    isPlayerBullet: boolean;
}

export interface PlayerEntity {
    position: Position;
    direction: Direction | '';
    hidden: boolean;
    /** Currently-held input direction; '' when no movement key is held. */
    inputDirection: Direction | '';
    /** Sim ticks elapsed since the player last processed a move. */
    moveTickAccumulator: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'won' | 'lost';

/** A complete, self-contained map: the tile layout plus everything that used
 * to be authored as global constants (FLAG_POSITION/INITIAL_TANK_SPAWNS/
 * PLAYER_START_POSITION) — those only worked as globals when there was
 * exactly one map. One `LevelDefinition` per playable map, collected in
 * maps/registry.ts. */
export interface LevelDefinition {
    tiles: TileGrid;
    /** [row, col] tile-grid indices of the eagle base's 4 sub-tiles. */
    flagPosition: GridCell[];
    tankSpawns: { position: Position; direction: Direction }[];
    playerStart: { position: Position; direction: Direction };
}

export interface EngineSnapshot {
    status: GameStatus;
    tiles: TileGrid;
    tanks: TankEntity[];
    bullets: BulletEntity[];
    player: PlayerEntity;
    timeRemainingSec: number;
    levelIndex: number;
    totalLevels: number;
}
