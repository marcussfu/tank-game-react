import type { EngineEventListener } from './events';
import type { Direction, EngineSnapshot } from './types';

/**
 * The surface the React UI needs from "the thing running the game" — satisfied
 * both by the local {@link Engine} (M2) and by {@link NetworkGameClient} (M-MP-4),
 * so `World` can swap one for the other without any downstream component
 * caring which is in play.
 *
 * The network client implements the mutating methods by sending a message to
 * the authoritative server; `tick()` is a no-op there (the server ticks).
 */
export interface GameController {
    /** Subscribe to engine events. In network mode these are the server's
     * broadcast events, re-emitted verbatim. Returns an unsubscribe fn. */
    on(listener: EngineEventListener): () => void;

    /** The current world state. In network mode: the latest snapshot received
     * from the server (a neutral empty snapshot until the first arrives). */
    getSnapshot(): EngineSnapshot;

    /** Begin a game. `playerCount` is 1 (solo) or 2 (co-op). */
    start(playerCount?: number): void;

    /** Back to the menu / tear down the current game. */
    returnToMenu(): void;

    /** Advance to the next level after a stage-clear win. */
    advanceLevel(): void;

    togglePause(): void;

    /** Set player `playerId`'s held movement direction ('' to stop). */
    setPlayerInputDirection(dir: Direction | '', playerId?: number): void;

    /** Fire player `playerId`'s bullet. */
    firePlayerBullet(playerId?: number): void;

    /** Advance the simulation one fixed step. No-op in network mode. */
    tick(): void;
}
