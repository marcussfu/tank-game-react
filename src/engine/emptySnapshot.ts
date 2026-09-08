import { LEVELS } from './maps/registry';
import { setupTiles } from './map/mapLoader';
import { STARTING_LIVES, TIME_LIMIT_SEC } from './constants';
import type { EngineSnapshot, PlayerEntity } from './types';

const makePlayer = (id: number): PlayerEntity => {
    const spawn = LEVELS[0].playerStarts[id] ?? LEVELS[0].playerStarts[0];
    return {
        id,
        position: spawn.position,
        direction: spawn.direction,
        hidden: false,
        inputDirection: '',
        moveTickAccumulator: 0,
        invincible: false,
        lives: STARTING_LIVES,
        active: true,
        spawn,
    };
};

/**
 * A valid, idle snapshot for when there is no game state yet — the
 * {@link NetworkGameClient}'s placeholder before its first server snapshot,
 * and a convenient base for test doubles.
 */
export const emptySnapshot = (playerCount = 1): EngineSnapshot => {
    const players = Array.from({ length: Math.min(Math.max(playerCount, 1), 2) }, (_, id) => makePlayer(id));
    return {
        status: 'idle',
        tiles: setupTiles(LEVELS[0].tiles),
        tanks: [],
        bullets: [],
        powerups: [],
        players,
        player: players[0],
        timeRemainingSec: TIME_LIMIT_SEC,
        levelIndex: 0,
        totalLevels: LEVELS.length,
        lives: players[0].lives,
    };
};
