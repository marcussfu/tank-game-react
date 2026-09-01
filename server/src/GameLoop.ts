import { Engine } from '../../src/engine/Engine';
import { SIM_TICK_MS } from '../../src/engine/constants';
import type { EngineEvent, EngineEventListener } from '../../src/engine/events';
import type { Direction, EngineSnapshot } from '../../src/engine/types';

/** One player's intent for a tick, as it will arrive over the wire in M-MP-3. */
export interface PlayerInput {
    /** Held movement direction, or '' to stop. Omit to leave movement unchanged. */
    direction?: Direction | '';
    /** Fire once this tick. */
    fire?: boolean;
}

export interface GameLoopOptions {
    /** Milliseconds between ticks. Defaults to the engine's own SIM_TICK_MS so
     * the server advances the simulation at exactly the rate it was designed
     * for. Overridable for tests. */
    tickMs?: number;
}

/**
 * Runs an `Engine` headlessly in Node on a fixed wall-clock interval — the
 * server-side counterpart to the browser's `CanvasStage` RAF loop. It owns no
 * rendering and no Redux; it just advances the simulation and exposes the
 * snapshot plus the engine event stream, which M-MP-3 will serialize over a
 * WebSocket.
 *
 * Deliberately one `engine.tick()` per interval (no RAF-style catch-up
 * accumulator): a long-lived server process has no backgrounded-tab pause to
 * recover from, and one-tick-per-interval keeps the loop trivially
 * deterministic under fake timers.
 */
export class GameLoop {
    private readonly engine = new Engine();
    private readonly tickMs: number;
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(options: GameLoopOptions = {}) {
        this.tickMs = options.tickMs ?? SIM_TICK_MS;
    }

    get isRunning(): boolean {
        return this.timer !== null;
    }

    /** Begins (or restarts) a game and starts ticking. `playerCount` is 1 for
     * solo, 2 for co-op — the same argument `Engine.start` takes. */
    start(playerCount = 1): void {
        this.stop();
        this.engine.start(playerCount);
        this.timer = setInterval(() => this.engine.tick(), this.tickMs);
    }

    /** Stops the interval. The engine keeps its state — `resume`-style
     * restarts happen through `engine`'s own pause/resume, not here. */
    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /** Applies one player's input for the upcoming ticks. `playerId` is 0 or 1. */
    applyInput(playerId: number, input: PlayerInput): void {
        if (input.direction !== undefined) {
            this.engine.setPlayerInputDirection(input.direction, playerId);
        }
        if (input.fire) {
            this.engine.firePlayerBullet(playerId);
        }
    }

    togglePause(): void {
        this.engine.togglePause();
    }

    /** The authoritative world state — M-MP-3 broadcasts this to clients. */
    getSnapshot(): EngineSnapshot {
        return this.engine.getSnapshot();
    }

    /** Subscribe to the engine event stream (tank spawns, hits, level changes…).
     * Returns an unsubscribe function. */
    onEvent(listener: EngineEventListener): () => void {
        return this.engine.on(listener);
    }
}

export type { EngineEvent, EngineSnapshot };
