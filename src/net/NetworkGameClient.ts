import { EngineEventBus } from '../engine/events';
import type { EngineEventListener } from '../engine/events';
import type { GameController } from '../engine/GameController';
import type { Direction, EngineSnapshot } from '../engine/types';
import { emptySnapshot } from '../engine/emptySnapshot';
import {
    PROTOCOL_VERSION,
    decodeServerMessage,
    encode,
} from './protocol';
import type { ClientMessage } from './protocol';

/** The slice of the browser `WebSocket` API this client uses — narrowed so a
 * test can pass a fake. */
export interface SocketLike {
    send(data: string): void;
    close(): void;
    readonly readyState: number;
    onopen: ((ev: unknown) => void) | null;
    onmessage: ((ev: { data: unknown }) => void) | null;
    onclose: ((ev: unknown) => void) | null;
    onerror: ((ev: unknown) => void) | null;
}

export type ConnectionState = 'connecting' | 'open' | 'closed';

export interface NetworkGameClientOptions {
    /** Defaults to the global `WebSocket`. Tests inject a fake. */
    socketFactory?: (url: string) => SocketLike;
    /** Room to join; server default is used when omitted. */
    roomId?: string;
}

/**
 * A {@link GameController} backed by the authoritative WebSocket server
 * (M-MP-3) instead of a local {@link Engine}. Every mutating call becomes a
 * message to the server; `getSnapshot()` returns the most recent broadcast
 * snapshot; and — the key to reusing the whole existing UI — server `event`
 * messages are re-emitted through the same `EngineEventBus` the local engine
 * uses, so `engineBridge` and `audioManager` drive Redux and sound exactly as
 * they do in single-player.
 */
export class NetworkGameClient implements GameController {
    private readonly bus = new EngineEventBus();
    private readonly socket: SocketLike;
    private readonly roomId?: string;

    private latest: EngineSnapshot | null = null;
    private previous: EngineSnapshot | null = null;
    /** `performance.now()` when `latest` arrived — CanvasStage uses it for the
     * interpolation alpha. */
    private latestAt = 0;
    private serverTick = 0;

    private connection: ConnectionState = 'connecting';
    private playerId = 0;
    private peerConnected = false;
    /** A `start` requested before the socket opened, replayed on open. */
    private queuedStart: number | null = null;

    constructor(url: string, options: NetworkGameClientOptions = {}) {
        this.roomId = options.roomId;
        const factory = options.socketFactory ?? ((u: string) => new WebSocket(u) as unknown as SocketLike);
        this.socket = factory(url);
        this.socket.onopen = () => this.onOpen();
        this.socket.onmessage = (ev) => this.onMessage(String(ev.data));
        this.socket.onclose = () => this.onClose();
        this.socket.onerror = () => this.onClose();
    }

    // ---- connection status (for the UI / M-MP-5 HUD) ----

    get connectionState(): ConnectionState {
        return this.connection;
    }
    get localPlayerId(): number {
        return this.playerId;
    }
    get isPeerConnected(): boolean {
        return this.peerConnected;
    }
    /** ms since the last snapshot arrived — CanvasStage's interpolation alpha
     * is `elapsedSinceSnapshot() / SIM_TICK_MS`. */
    elapsedSinceSnapshot(now = performance.now()): number {
        return now - this.latestAt;
    }
    /** The snapshot before `getSnapshot()`'s, for interpolation. */
    getPreviousSnapshot(): EngineSnapshot | null {
        return this.previous;
    }
    get currentServerTick(): number {
        return this.serverTick;
    }

    // ---- GameController ----

    on(listener: EngineEventListener): () => void {
        return this.bus.on(listener);
    }

    getSnapshot(): EngineSnapshot {
        return this.latest ?? emptySnapshot();
    }

    start(playerCount = 1): void {
        this.sendOrQueueStart(playerCount);
    }

    returnToMenu(): void {
        this.send({ type: 'leave' });
        this.socket.close();
        this.connection = 'closed';
        // Reset the UI back to the menu, same event the local engine emits.
        this.bus.emit({ type: 'gameReset' });
    }

    advanceLevel(): void {
        this.send({ type: 'advance' });
    }

    togglePause(): void {
        this.send({ type: 'togglePause' });
    }

    setPlayerInputDirection(dir: Direction | '', playerId = 0): void {
        // A network client can only ever move its own tank; ignore anything
        // addressed to the other slot.
        if (playerId !== this.playerId) return;
        this.send({ type: 'input', direction: dir });
    }

    firePlayerBullet(playerId = 0): void {
        if (playerId !== this.playerId) return;
        this.send({ type: 'input', fire: true });
    }

    /** No-op: the server ticks the authoritative simulation. */
    tick(): void {}

    // ---- socket plumbing ----

    private sendOrQueueStart(playerCount: number): void {
        if (this.connection === 'open') {
            this.send({ type: 'start', playerCount: playerCount === 2 ? 2 : 1 });
        } else {
            this.queuedStart = playerCount;
        }
    }

    private send(message: ClientMessage): void {
        if (this.socket.readyState === 1 /* OPEN */) {
            this.socket.send(encode(message));
        }
    }

    private onOpen(): void {
        this.connection = 'open';
        this.socket.send(encode({ type: 'join', protocolVersion: PROTOCOL_VERSION, roomId: this.roomId }));
        if (this.queuedStart !== null) {
            this.send({ type: 'start', playerCount: this.queuedStart === 2 ? 2 : 1 });
            this.queuedStart = null;
        }
    }

    private onMessage(raw: string): void {
        const message = decodeServerMessage(raw);
        if (!message) return;

        switch (message.type) {
            case 'joined':
                this.playerId = message.playerId;
                this.peerConnected = message.occupiedSlots.some((s) => s !== message.playerId);
                break;
            case 'peer':
                if (message.playerId !== this.playerId) this.peerConnected = message.connected;
                break;
            case 'snapshot':
                this.previous = this.latest;
                this.latest = message.snapshot;
                this.latestAt = performance.now();
                this.serverTick = message.serverTick;
                break;
            case 'event':
                // Re-emit verbatim so engineBridge / audioManager behave
                // exactly as in single-player.
                this.bus.emit(message.event);
                break;
            case 'error':
                console.warn('[net] server error:', message.code, message.message);
                break;
        }
    }

    private onClose(): void {
        if (this.connection === 'closed') return;
        this.connection = 'closed';
        this.bus.emit({ type: 'gameReset' });
    }
}
