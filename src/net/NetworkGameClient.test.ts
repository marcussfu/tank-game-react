import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkGameClient } from './NetworkGameClient';
import type { SocketLike } from './NetworkGameClient';
import { PROTOCOL_VERSION } from './protocol';
import type { ClientMessage, ServerMessage } from './protocol';
import { emptySnapshot } from '../engine/emptySnapshot';
import type { EngineEvent } from '../engine/events';

class FakeSocket implements SocketLike {
    readyState = 0; // CONNECTING
    onopen: ((ev: unknown) => void) | null = null;
    onmessage: ((ev: { data: unknown }) => void) | null = null;
    onclose: ((ev: unknown) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    readonly sent: ClientMessage[] = [];

    send(data: string): void {
        this.sent.push(JSON.parse(data) as ClientMessage);
    }
    close(): void {
        this.readyState = 3;
    }

    // --- test helpers ---
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

const build = () => {
    const socket = new FakeSocket();
    const client = new NetworkGameClient('ws://x', { socketFactory: () => socket });
    return { socket, client };
};

const snapshotMsg = (serverTick: number): ServerMessage => ({
    type: 'snapshot',
    serverTick,
    snapshot: { ...emptySnapshot(2), status: 'playing' },
});

describe('NetworkGameClient', () => {
    beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
    afterEach(() => vi.restoreAllMocks());

    it('sends a versioned join on open', () => {
        const { socket } = build();
        expect(socket.sent).toHaveLength(0);
        socket.open();
        expect(socket.sent[0]).toEqual({ type: 'join', protocolVersion: PROTOCOL_VERSION, roomId: undefined });
    });

    it('queues a start() made before open and replays it after', () => {
        const { socket, client } = build();
        client.start(2);
        expect(socket.sent).toHaveLength(0);
        socket.open();
        expect(socket.sent).toContainEqual({ type: 'start', playerCount: 2 });
    });

    it('sends start() immediately once open', () => {
        const { socket, client } = build();
        socket.open();
        socket.sent.length = 0;
        client.start(1);
        expect(socket.sent).toEqual([{ type: 'start', playerCount: 1 }]);
    });

    it('tracks the assigned player slot and connection state from joined', () => {
        const { socket, client } = build();
        socket.open();
        expect(client.connectionState).toBe('open');
        socket.receive({ type: 'joined', roomId: 'default', playerId: 1, occupiedSlots: [0, 1] });
        expect(client.localPlayerId).toBe(1);
        expect(client.isPeerConnected).toBe(true);
    });

    it('exposes the latest snapshot and keeps the previous one for interpolation', () => {
        const { socket, client } = build();
        socket.open();
        expect(client.getSnapshot().status).toBe('idle'); // placeholder before first
        socket.receive(snapshotMsg(1));
        socket.receive(snapshotMsg(2));
        expect(client.currentServerTick).toBe(2);
        expect(client.getSnapshot().status).toBe('playing');
        expect(client.getPreviousSnapshot()).not.toBeNull();
    });

    it('re-emits server events to on() subscribers verbatim', () => {
        const { socket, client } = build();
        const seen: EngineEvent[] = [];
        client.on((e) => seen.push(e));
        socket.open();
        socket.receive({ type: 'event', event: { type: 'tankSpawned', keyIndex: 5, position: [0, 0] } });
        socket.receive({ type: 'event', event: { type: 'livesChanged', playerId: 1, lives: 2 } });
        expect(seen).toEqual([
            { type: 'tankSpawned', keyIndex: 5, position: [0, 0] },
            { type: 'livesChanged', playerId: 1, lives: 2 },
        ]);
    });

    it('forwards input only for the local slot', () => {
        const { socket, client } = build();
        socket.open();
        socket.receive({ type: 'joined', roomId: 'default', playerId: 1, occupiedSlots: [1] });
        socket.sent.length = 0;

        client.setPlayerInputDirection('NORTH', 1);
        client.firePlayerBullet(1);
        client.setPlayerInputDirection('SOUTH', 0); // not our slot — dropped

        expect(socket.sent).toEqual([
            { type: 'input', direction: 'NORTH' },
            { type: 'input', fire: true },
        ]);
    });

    it('maps togglePause / advanceLevel to their messages', () => {
        const { socket, client } = build();
        socket.open();
        socket.sent.length = 0;
        client.togglePause();
        client.advanceLevel();
        expect(socket.sent).toEqual([{ type: 'togglePause' }, { type: 'advance' }]);
    });

    it('returnToMenu leaves, closes, and emits gameReset', () => {
        const { socket, client } = build();
        const seen: string[] = [];
        client.on((e) => seen.push(e.type));
        socket.open();
        client.returnToMenu();
        expect(socket.sent).toContainEqual({ type: 'leave' });
        expect(client.connectionState).toBe('closed');
        expect(seen).toContain('gameReset');
    });

    it('emits gameReset and goes closed when the socket drops', () => {
        const { socket, client } = build();
        const seen: string[] = [];
        client.on((e) => seen.push(e.type));
        socket.open();
        socket.remoteClose();
        expect(client.connectionState).toBe('closed');
        expect(seen).toEqual(['gameReset']);
    });

    it('tick() is a no-op', () => {
        const { socket, client } = build();
        socket.open();
        socket.sent.length = 0;
        client.tick();
        expect(socket.sent).toHaveLength(0);
    });

    it('tracks peer connect / disconnect', () => {
        const { socket, client } = build();
        socket.open();
        socket.receive({ type: 'joined', roomId: 'default', playerId: 0, occupiedSlots: [0] });
        expect(client.isPeerConnected).toBe(false);
        socket.receive({ type: 'peer', playerId: 1, connected: true });
        expect(client.isPeerConnected).toBe(true);
        socket.receive({ type: 'peer', playerId: 1, connected: false });
        expect(client.isPeerConnected).toBe(false);
    });
});
