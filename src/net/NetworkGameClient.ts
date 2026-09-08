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

/**
 * - `connecting` — the (re)connecting socket hasn't opened / joined yet
 * - `lobby` — joined, waiting for player 2 or for someone to start
 * - `playing` — snapshots are flowing
 * - `reconnecting` — the socket dropped mid-session; retrying
 * - `closed` — done (user left, or reconnect gave up)
 */
export type NetPhase = 'connecting' | 'lobby' | 'playing' | 'reconnecting' | 'closed';

/** Everything the lobby / HUD needs, pushed on every change. */
export interface NetState {
    phase: NetPhase;
    /** Server-assigned player slot (0 or 1). */
    playerId: number;
    roomId: string | null;
    peerConnected: boolean;
    /** Round-trip latency in ms, or null before the first pong. */
    latencyMs: number | null;
    /** How many reconnect attempts have been made in the current outage. */
    reconnectAttempt: number;
}

export type NetStateListener = (state: NetState) => void;

export interface NetworkGameClientOptions {
    /** Defaults to the global `WebSocket`. Tests inject a fake. */
    socketFactory?: (url: string) => SocketLike;
    /** Room to join; server default is used when omitted. */
    roomId?: string;
    /** Latency-probe interval. Default 2000ms; 0 disables pinging. */
    pingIntervalMs?: number;
    /** Reconnect backoff. Default 1000ms. */
    reconnectDelayMs?: number;
    /** Give up after this many failed reconnects. Default 5. */
    maxReconnectAttempts?: number;
}

/**
 * A {@link GameController} backed by the authoritative WebSocket server
 * instead of a local {@link Engine}. Every mutating call becomes a message;
 * `getSnapshot()` returns the most recent broadcast snapshot; and — the key to
 * reusing the whole existing UI — server `event` messages are re-emitted
 * through the same `EngineEventBus` the local engine uses, so `engineBridge`
 * and `audioManager` drive Redux and sound exactly as in single-player.
 *
 * M-MP-5 adds the lifecycle around that core: a lobby phase (no more
 * auto-start), latency probing, and a bounded reconnect that rejoins the same
 * room after a mid-session drop.
 */
export class NetworkGameClient implements GameController {
    private readonly bus = new EngineEventBus();
    private readonly netListeners = new Set<NetStateListener>();

    private readonly url: string;
    private readonly makeSocket: (url: string) => SocketLike;
    private readonly pingIntervalMs: number;
    private readonly reconnectDelayMs: number;
    private readonly maxReconnectAttempts: number;

    private socket: SocketLike | null = null;
    private latest: EngineSnapshot | null = null;
    private previous: EngineSnapshot | null = null;
    private latestAt = 0;
    private serverTick = 0;

    private phase: NetPhase = 'connecting';
    private playerId = 0;
    private roomId: string | null;
    private peerConnected = false;
    private latencyMs: number | null = null;
    private reconnectAttempt = 0;

    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    /** True once the user has intentionally left — suppresses reconnects. */
    private done = false;

    constructor(url: string, options: NetworkGameClientOptions = {}) {
        this.url = url;
        this.roomId = options.roomId ?? null;
        this.makeSocket = options.socketFactory ?? ((u: string) => new WebSocket(u) as unknown as SocketLike);
        this.pingIntervalMs = options.pingIntervalMs ?? 2000;
        this.reconnectDelayMs = options.reconnectDelayMs ?? 1000;
        this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
        this.openSocket();
    }

    // ---- observation ----

    /** Subscribe to lobby / connection / latency changes. Fires once
     * immediately with the current state. Returns an unsubscribe fn. */
    onNetState(listener: NetStateListener): () => void {
        this.netListeners.add(listener);
        listener(this.netState());
        return () => this.netListeners.delete(listener);
    }

    netState(): NetState {
        return {
            phase: this.phase,
            playerId: this.playerId,
            roomId: this.roomId,
            peerConnected: this.peerConnected,
            latencyMs: this.latencyMs,
            reconnectAttempt: this.reconnectAttempt,
        };
    }

    get localPlayerId(): number {
        return this.playerId;
    }
    get isPeerConnected(): boolean {
        return this.peerConnected;
    }
    get currentPhase(): NetPhase {
        return this.phase;
    }
    elapsedSinceSnapshot(now = performance.now()): number {
        return now - this.latestAt;
    }
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

    /** Explicitly start a game (the lobby's "START SOLO" / host action).
     * `playerCount` 1 or 2. */
    start(playerCount = 1): void {
        this.send({ type: 'start', playerCount: playerCount === 2 ? 2 : 1 });
    }

    returnToMenu(): void {
        this.done = true;
        this.send({ type: 'leave' });
        this.teardownSocket();
        this.setPhase('closed');
        this.bus.emit({ type: 'gameReset' });
    }

    advanceLevel(): void {
        this.send({ type: 'advance' });
    }

    togglePause(): void {
        this.send({ type: 'togglePause' });
    }

    setPlayerInputDirection(dir: Direction | '', playerId = 0): void {
        if (playerId !== this.playerId) return;
        this.send({ type: 'input', direction: dir });
    }

    firePlayerBullet(playerId = 0): void {
        if (playerId !== this.playerId) return;
        this.send({ type: 'input', fire: true });
    }

    /** No-op: the server ticks the authoritative simulation. */
    tick(): void {}

    /** Silent teardown for React unmount — no `gameReset`, no reconnect. */
    dispose(): void {
        this.done = true;
        this.teardownSocket();
        this.phase = 'closed';
    }

    // ---- socket lifecycle ----

    private openSocket(): void {
        const socket = this.makeSocket(this.url);
        this.socket = socket;
        socket.onopen = () => this.onOpen();
        socket.onmessage = (ev) => this.onMessage(String(ev.data));
        socket.onclose = () => this.onClose();
        socket.onerror = () => this.onClose();
    }

    private teardownSocket(): void {
        if (this.pingTimer !== null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const socket = this.socket;
        this.socket = null;
        if (socket) {
            socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
            try {
                socket.close();
            } catch {
                // already closed
            }
        }
    }

    private onOpen(): void {
        this.socket?.send(encode({ type: 'join', protocolVersion: PROTOCOL_VERSION, roomId: this.roomId ?? undefined }));
        if (this.pingIntervalMs > 0 && this.pingTimer === null) {
            this.pingTimer = setInterval(() => this.send({ type: 'ping', t: Date.now() }), this.pingIntervalMs);
        }
    }

    private onMessage(raw: string): void {
        const message = decodeServerMessage(raw);
        if (!message) return;

        switch (message.type) {
            case 'joined':
                this.playerId = message.playerId;
                this.roomId = message.roomId;
                this.peerConnected = message.occupiedSlots.some((s) => s !== message.playerId);
                this.reconnectAttempt = 0;
                this.setPhase(message.gameRunning ? 'playing' : 'lobby');
                break;
            case 'peer':
                if (message.playerId !== this.playerId) {
                    this.peerConnected = message.connected;
                    this.emitNetState();
                }
                break;
            case 'snapshot':
                this.previous = this.latest;
                this.latest = message.snapshot;
                this.latestAt = performance.now();
                this.serverTick = message.serverTick;
                if (this.phase !== 'playing') this.setPhase('playing');
                break;
            case 'event':
                this.bus.emit(message.event);
                break;
            case 'pong':
                this.latencyMs = Math.max(0, Date.now() - message.t);
                this.emitNetState();
                break;
            case 'error':
                console.warn('[net] server error:', message.code, message.message);
                break;
        }
    }

    private onClose(): void {
        if (this.done || this.phase === 'closed') return;
        if (this.pingTimer !== null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        this.socket = null;

        if (this.reconnectAttempt >= this.maxReconnectAttempts) {
            this.setPhase('closed');
            this.bus.emit({ type: 'gameReset' });
            return;
        }
        this.reconnectAttempt += 1;
        this.setPhase('reconnecting');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.done) this.openSocket();
        }, this.reconnectDelayMs);
    }

    private send(message: ClientMessage): void {
        if (this.socket && this.socket.readyState === 1 /* OPEN */) {
            this.socket.send(encode(message));
        }
    }

    private setPhase(phase: NetPhase): void {
        if (this.phase === phase) return;
        this.phase = phase;
        this.emitNetState();
    }

    private emitNetState(): void {
        const state = this.netState();
        for (const listener of this.netListeners) listener(state);
    }
}
