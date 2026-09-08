import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkGameClient } from './NetworkGameClient';
import type { NetworkGameClientOptions, SocketLike } from './NetworkGameClient';
import { PROTOCOL_VERSION } from './protocol';
import type { ClientMessage, JoinedMessage, ServerMessage } from './protocol';
import { emptySnapshot } from '../engine/emptySnapshot';
import type { EngineEvent } from '../engine/events';

class FakeSocket implements SocketLike {
    readyState = 0; // CONNECTING
    onopen: ((ev: unknown) => void) | null = null;
    onmessage: ((ev: { data: unknown }) => void) | null = null;
    onclose: ((ev: unknown) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    readonly sent: ClientMessage[] = [];
    closed = false;

    send(data: string): void {
        this.sent.push(JSON.parse(data) as ClientMessage);
    }
    close(): void {
        this.closed = true;
        this.readyState = 3;
    }

    open(): void {
        this.readyState = 1;
        this.onopen?.({});
    }
    receive(message: ServerMessage): void {
        this.onmessage?.({ data: JSON.stringify(message) });
    }
    remoteClose(): void {
        this.readyState = 3;
        this.onclose?.({});
    }
}

const joined = (over: Partial<JoinedMessage> = {}): ServerMessage => ({
    type: 'joined', roomId: 'default', playerId: 0, occupiedSlots: [0], gameRunning: false, ...over,
});
const snapshotMsg = (serverTick: number): ServerMessage => ({
    type: 'snapshot', serverTick, snapshot: { ...emptySnapshot(2), status: 'playing' },
});

/** Builds a client whose sockets come from a queue of FakeSockets, one per
 * (re)connect. */
const build = (opts: Partial<NetworkGameClientOptions> = {}) => {
    const sockets: FakeSocket[] = [];
    const client = new NetworkGameClient('ws://x', {
        pingIntervalMs: 1000,
        reconnectDelayMs: 500,
        maxReconnectAttempts: 3,
        ...opts,
        socketFactory: () => {
            const s = new FakeSocket();
            sockets.push(s);
            return s;
        },
    });
    return { client, sockets, socket: () => sockets[sockets.length - 1] };
};

describe('NetworkGameClient', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('sends a versioned join on open and does NOT auto-start a game', () => {
        const { client, socket } = build();
        expect(client.currentPhase).toBe('connecting');
        socket().open();
        expect(socket().sent).toEqual([{ type: 'join', protocolVersion: PROTOCOL_VERSION, roomId: undefined }]);
    });

    it('goes to the lobby on joined when no game is running', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined({ playerId: 1, occupiedSlots: [0, 1] }));
        expect(client.currentPhase).toBe('lobby');
        expect(client.localPlayerId).toBe(1);
        expect(client.isPeerConnected).toBe(true);
    });

    it('resumes straight into play when joined says a game is already running', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined({ gameRunning: true }));
        expect(client.currentPhase).toBe('playing');
    });

    it('start() sends a start message (the lobby "START SOLO" action)', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined());
        socket().sent.length = 0;
        client.start(1);
        expect(socket().sent).toEqual([{ type: 'start', playerCount: 1 }]);
    });

    it('the first snapshot flips the phase to playing and keeps the previous snapshot', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined());
        socket().receive(snapshotMsg(1));
        expect(client.currentPhase).toBe('playing');
        socket().receive(snapshotMsg(2));
        expect(client.currentServerTick).toBe(2);
        expect(client.getPreviousSnapshot()).not.toBeNull();
    });

    it('re-emits server events to on() subscribers verbatim', () => {
        const { client, socket } = build();
        const seen: EngineEvent[] = [];
        client.on((e) => seen.push(e));
        socket().open();
        socket().receive({ type: 'event', event: { type: 'tankSpawned', keyIndex: 5, position: [0, 0] } });
        expect(seen).toEqual([{ type: 'tankSpawned', keyIndex: 5, position: [0, 0] }]);
    });

    it('pings on an interval and derives latency from the pong', () => {
        const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
        const { client, socket } = build();
        socket().open();
        socket().sent.length = 0;

        vi.advanceTimersByTime(1000); // one ping tick
        const ping = socket().sent.find((m) => m.type === 'ping');
        expect(ping).toEqual({ type: 'ping', t: 10_000 });

        nowSpy.mockReturnValue(10_042);
        socket().receive({ type: 'pong', t: 10_000 });
        expect(client.netState().latencyMs).toBe(42);
    });

    it('forwards input only for the local slot', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined({ playerId: 1, occupiedSlots: [1] }));
        socket().sent.length = 0;

        client.setPlayerInputDirection('NORTH', 1);
        client.firePlayerBullet(1);
        client.setPlayerInputDirection('SOUTH', 0); // not our slot — dropped

        expect(socket().sent).toEqual([
            { type: 'input', direction: 'NORTH' },
            { type: 'input', fire: true },
        ]);
    });

    it('maps togglePause / advanceLevel to their messages', () => {
        const { client, socket } = build();
        socket().open();
        socket().sent.length = 0;
        client.togglePause();
        client.advanceLevel();
        expect(socket().sent).toEqual([{ type: 'togglePause' }, { type: 'advance' }]);
    });

    it('returnToMenu leaves, closes, and emits gameReset', () => {
        const { client, socket } = build();
        const seen: string[] = [];
        client.on((e) => seen.push(e.type));
        socket().open();
        client.returnToMenu();
        expect(socket().sent).toContainEqual({ type: 'leave' });
        expect(socket().closed).toBe(true);
        expect(client.currentPhase).toBe('closed');
        expect(seen).toContain('gameReset');
    });

    it('reconnects after an unexpected drop, rejoining the same room', () => {
        const { client, sockets, socket } = build();
        socket().open();
        socket().receive(joined());
        socket().receive(snapshotMsg(1)); // playing

        socket().remoteClose();
        expect(client.currentPhase).toBe('reconnecting');
        expect(client.netState().reconnectAttempt).toBe(1);

        vi.advanceTimersByTime(500); // reconnect delay
        expect(sockets).toHaveLength(2); // a new socket was opened
        sockets[1].open();
        expect(sockets[1].sent[0]).toEqual({ type: 'join', protocolVersion: PROTOCOL_VERSION, roomId: 'default' });

        sockets[1].receive(joined({ gameRunning: true }));
        expect(client.currentPhase).toBe('playing');
        expect(client.netState().reconnectAttempt).toBe(0); // reset on rejoin
    });

    it('gives up (gameReset, phase closed) after maxReconnectAttempts', () => {
        const { client, sockets, socket } = build({ maxReconnectAttempts: 2 });
        const seen: string[] = [];
        client.on((e) => seen.push(e.type));
        socket().open();
        socket().receive(joined());

        // drop -> attempt 1
        sockets[0].remoteClose();
        vi.advanceTimersByTime(500);
        // drop -> attempt 2
        sockets[1].remoteClose();
        vi.advanceTimersByTime(500);
        // drop -> over the limit
        sockets[2].remoteClose();

        expect(client.currentPhase).toBe('closed');
        expect(seen).toContain('gameReset');
    });

    it('dispose() tears down silently — no gameReset, no reconnect', () => {
        const { client, sockets, socket } = build();
        const seen: string[] = [];
        client.on((e) => seen.push(e.type));
        socket().open();
        socket().receive(joined());

        client.dispose();
        expect(client.currentPhase).toBe('closed');
        expect(sockets[0].closed).toBe(true);
        expect(seen).not.toContain('gameReset');

        socket().remoteClose(); // ignored
        vi.advanceTimersByTime(5000);
        expect(sockets).toHaveLength(1); // no reconnect attempted
    });

    it('onNetState fires immediately with the current state and on each change', () => {
        const { client, socket } = build();
        const phases: string[] = [];
        client.onNetState((s) => phases.push(s.phase));
        expect(phases).toEqual(['connecting']);
        socket().open();
        socket().receive(joined());
        socket().receive(snapshotMsg(1));
        expect(phases).toEqual(['connecting', 'lobby', 'playing']);
    });

    it('tracks peer connect / disconnect', () => {
        const { client, socket } = build();
        socket().open();
        socket().receive(joined({ playerId: 0, occupiedSlots: [0] }));
        expect(client.isPeerConnected).toBe(false);
        socket().receive({ type: 'peer', playerId: 1, connected: true });
        expect(client.isPeerConnected).toBe(true);
        socket().receive({ type: 'peer', playerId: 1, connected: false });
        expect(client.isPeerConnected).toBe(false);
    });

    it('tick() is a no-op', () => {
        const { client, socket } = build();
        socket().open();
        socket().sent.length = 0;
        client.tick();
        expect(socket().sent).toHaveLength(0);
    });
});
