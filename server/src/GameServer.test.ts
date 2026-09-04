import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { GameServer } from './GameServer';
import { PROTOCOL_VERSION, encode } from '../../src/net/protocol';
import type { ClientMessage, ServerMessage } from '../../src/net/protocol';

/** A test client: connects, buffers every server message, and can wait for the
 * next one matching a predicate. */
class TestClient {
    private readonly ws: WebSocket;
    readonly inbox: ServerMessage[] = [];
    private readonly waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];

    private constructor(url: string) {
        this.ws = new WebSocket(url);
        this.ws.on('message', (data) => {
            const msg = JSON.parse(data.toString()) as ServerMessage;
            this.inbox.push(msg);
            for (let i = this.waiters.length - 1; i >= 0; i--) {
                if (this.waiters[i].match(msg)) {
                    this.waiters[i].resolve(msg);
                    this.waiters.splice(i, 1);
                }
            }
        });
    }

    static async connect(port: number): Promise<TestClient> {
        const c = new TestClient(`ws://localhost:${port}`);
        await new Promise<void>((resolve, reject) => {
            c.ws.once('open', () => resolve());
            c.ws.once('error', reject);
        });
        return c;
    }

    send(message: ClientMessage): void {
        this.ws.send(encode(message));
    }

    waitFor(match: (m: ServerMessage) => boolean, timeoutMs = 2000): Promise<ServerMessage> {
        const existing = this.inbox.find(match);
        if (existing) return Promise.resolve(existing);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('waitFor timed out')), timeoutMs);
            this.waiters.push({
                match,
                resolve: (m) => {
                    clearTimeout(timer);
                    resolve(m);
                },
            });
        });
    }

    waitForType<T extends ServerMessage['type']>(type: T, timeoutMs?: number) {
        return this.waitFor((m) => m.type === type, timeoutMs) as Promise<Extract<ServerMessage, { type: T }>>;
    }

    close(): void {
        this.ws.close();
    }
}

describe('GameServer', () => {
    let server: GameServer;
    let port: number;

    beforeEach(async () => {
        // Small tickMs so snapshots arrive fast without slowing the suite.
        server = new GameServer({ loopOptions: { tickMs: 5 } });
        port = await server.listen();
    });

    afterEach(async () => {
        await server.close();
    });

    it('answers a join with a joined message carrying player slot 0', async () => {
        const c = await TestClient.connect(port);
        c.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });

        const joined = await c.waitForType('joined');
        expect(joined.playerId).toBe(0);
        expect(joined.roomId).toBe('default');
        c.close();
    });

    it('rejects a protocol-version mismatch', async () => {
        const c = await TestClient.connect(port);
        c.send({ type: 'join', protocolVersion: PROTOCOL_VERSION + 99 });

        const err = await c.waitForType('error');
        expect(err.code).toBe('bad-protocol');
        c.close();
    });

    it('gives the second joiner slot 1 and auto-starts a co-op game', async () => {
        const a = await TestClient.connect(port);
        a.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await a.waitForType('joined');

        const b = await TestClient.connect(port);
        b.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        const joinedB = await b.waitForType('joined');
        expect(joinedB.playerId).toBe(1);

        // Both clients start receiving broadcast snapshots for a 2-player game.
        const snap = await b.waitForType('snapshot');
        expect(snap.snapshot.players).toHaveLength(2);
        expect(snap.snapshot.status).toBe('playing');

        a.close();
        b.close();
    });

    it('rejects a third joiner with room-full', async () => {
        const a = await TestClient.connect(port);
        const b = await TestClient.connect(port);
        const c = await TestClient.connect(port);
        a.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await a.waitForType('joined');
        b.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await b.waitForType('joined');
        c.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });

        const err = await c.waitForType('error');
        expect(err.code).toBe('room-full');
        a.close();
        b.close();
        c.close();
    });

    it('forwards a client input to its own player and reflects it in the broadcast snapshot', async () => {
        const a = await TestClient.connect(port);
        const b = await TestClient.connect(port);
        a.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await a.waitForType('joined');
        b.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await b.waitForType('joined');
        await b.waitForType('snapshot'); // game running

        b.send({ type: 'input', direction: 'NORTH' });
        const moved = await b.waitFor(
            (m) => m.type === 'snapshot' && !arraysEqual(m.snapshot.players[1].position, m.snapshot.players[1].spawn.position),
        );
        expect(moved.type).toBe('snapshot');
        if (moved.type === 'snapshot') {
            expect(moved.snapshot.players[0].position).toEqual(moved.snapshot.players[0].spawn.position); // p1 untouched
        }
        a.close();
        b.close();
    });

    it('frees the slot and drops the room when the only client disconnects', async () => {
        const a = await TestClient.connect(port);
        a.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await a.waitForType('joined');
        expect(server.roomCount).toBe(1);

        a.close();
        await waitUntil(() => server.roomCount === 0);
        expect(server.roomCount).toBe(0);
    });

    it('tells a remaining peer when the other disconnects', async () => {
        const a = await TestClient.connect(port);
        const b = await TestClient.connect(port);
        a.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await a.waitForType('joined');
        b.send({ type: 'join', protocolVersion: PROTOCOL_VERSION });
        await b.waitForType('joined');

        b.close();
        const peerGone = await a.waitFor((m) => m.type === 'peer' && m.connected === false);
        expect(peerGone.type === 'peer' && peerGone.playerId).toBe(1);
        a.close();
    });

    it('errors when a non-joined client sends input', async () => {
        const c = await TestClient.connect(port);
        c.send({ type: 'input', fire: true });
        const err = await c.waitForType('error');
        expect(err.code).toBe('not-joined');
        c.close();
    });
});

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function waitUntil(cond: () => boolean, timeoutMs = 2000): Promise<void> {
    const start = Date.now();
    while (!cond()) {
        if (Date.now() - start > timeoutMs) throw new Error('waitUntil timed out');
        await new Promise((r) => setTimeout(r, 10));
    }
}
