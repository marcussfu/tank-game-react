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
    /** 0 for player 1, 1 for player 2. Routes keyboard input, HUD lives, and
     * per-player state; also the index into `Engine`'s `players` array. */
    id: number;
    position: Position;
    direction: Direction | '';
    hidden: boolean;
    /** Currently-held input direction; '' when no movement key is held. */
    inputDirection: Direction | '';
    /** Sim ticks elapsed since the player last processed a move. */
    moveTickAccumulator: number;
    /** While true, `hitPlayer()` is a no-op and driving onto a tank destroys
     * it instead of blocking movement — granted by the invincibility powerup. */
    invincible: boolean;
    /** Remaining lives for this player (co-op: each player has their own pool).
     * At 0 the player is `hidden` and `active` is false — out until next level. */
    lives: number;
    /** False once this player is out of lives — stays out for the rest of the
     * level; the game is only lost when every player is inactive. */
    active: boolean;
    /** This player's own respawn point (P1 and P2 start on different cells). */
    spawn: { position: Position; direction: Direction };
}

export type PowerupKind = 'invincibility' | 'freeze';

export interface PowerupEntity {
    keyIndex: string;
    position: Position;
    kind: PowerupKind;
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
    /** One entry per player slot — index 0 is player 1's start, index 1 is
     * player 2's (used only in a 2-player game). Every level must define at
     * least 2 so local co-op works on it. */
    playerStarts: { position: Position; direction: Direction }[];
}

export interface EngineSnapshot {
    status: GameStatus;
    tiles: TileGrid;
    tanks: TankEntity[];
    bullets: BulletEntity[];
    /** All players in the current game — 1 entry for a solo game, 2 for local
     * co-op. Index matches `PlayerEntity.id`. */
    players: PlayerEntity[];
    /** Back-compat alias for `players[0]` — pre-2P callers/renderers that only
     * ever cared about player 1. */
    player: PlayerEntity;
    powerups: PowerupEntity[];
    timeRemainingSec: number;
    levelIndex: number;
    totalLevels: number;
    /** Back-compat alias for `players[0].lives`. */
    lives: number;
}
