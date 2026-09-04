import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from './Room';
import type { RoomClient } from './Room';
import { decodeServerMessage } from '../../src/net/protocol';
import type { ServerMessage } from '../../src/net/protocol';
import { SIM_TICK_MS } from '../../src/engine/constants';

const makeClient = () => {
    const sent: ServerMessage[] = [];
    const client: RoomClient = {
        send: (raw) => {
            const m = decodeServerMessage(raw);
            if (m) sent.push(m);
        },
    };
    return { client, sent };
};

describe('Room', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('assigns slots 0 then 1, then rejects a third client', () => {
        const room = new Room('r1');
        const a = makeClient();
        const b = makeClient();
        const c = makeClient();

        expect(room.addClient(a.client)).toBe(0);
        expect(room.addClient(b.client)).toBe(1);
        expect(room.addClient(c.client)).toBeNull();
        expect(room.isFull).toBe(true);
        expect(room.occupiedSlots).toEqual([0, 1]);
    });

    it('tells existing peers when someone joins, but not the joiner itself', () => {
        const room = new Room('r1');
        const a = makeClient();
        const b = makeClient();
        room.addClient(a.client);
        room.addClient(b.client);

        expect(a.sent).toContainEqual({ type: 'peer', playerId: 1, connected: true });
        expect(b.sent).toHaveLength(0); // the joiner gets its 'joined' from GameServer, not Room
    });

    it('frees a slot on removeClient and notifies remaining peers', () => {
        const room = new Room('r1');
        const a = makeClient();
        const b = makeClient();
        room.addClient(a.client);
        room.addClient(b.client);

        expect(room.removeClient(a.client)).toBe(0);
        expect(room.occupiedSlots).toEqual([1]);
        expect(b.sent).toContainEqual({ type: 'peer', playerId: 0, connected: false });

        // The freed slot is reused by the next joiner.
        const c = makeClient();
        expect(room.addClient(c.client)).toBe(0);
    });

    it('is empty (and disposes) once the last client leaves', () => {
        const room = new Room('r1');
        const a = makeClient();
        room.addClient(a.client);
        room.startGame(1);
        expect(room.isRunning).toBe(true);

        room.removeClient(a.client);
        expect(room.isEmpty).toBe(true);
        expect(room.isRunning).toBe(false); // dispose() stopped the loop
    });

    it('broadcasts a snapshot every tick and engine events to all clients once the game starts', () => {
        const room = new Room('r1');
        const a = makeClient();
        const b = makeClient();
        room.addClient(a.client);
        room.addClient(b.client);
        a.sent.length = 0;
        b.sent.length = 0;

        room.startGame(2);
        // startGame -> loop.start emits gameStarted/levelChanged/livesChanged/tankSpawned synchronously
        expect(a.sent.some((m) => m.type === 'event' && m.event.type === 'gameStarted')).toBe(true);
        expect(b.sent.some((m) => m.type === 'event' && m.event.type === 'tankSpawned')).toBe(true);

        vi.advanceTimersByTime(SIM_TICK_MS * 3);
        const snapsA = a.sent.filter((m) => m.type === 'snapshot');
        expect(snapsA).toHaveLength(3);
        expect(snapsA[2]).toMatchObject({ type: 'snapshot', serverTick: 3 });
        expect(snapsA[2]).toHaveProperty('snapshot.players');
    });

    it('sends a late joiner the current snapshot immediately', () => {
        const room = new Room('r1');
        const a = makeClient();
        room.addClient(a.client);
        room.startGame(1);
        vi.advanceTimersByTime(SIM_TICK_MS * 5);

        const b = makeClient();
        room.addClient(b.client);
        expect(b.sent.some((m) => m.type === 'snapshot')).toBe(true);
    });

    it('routes applyInput to the sending client\'s own slot only', () => {
        const room = new Room('r1', { tickMs: SIM_TICK_MS });
        const a = makeClient();
        const b = makeClient();
        room.addClient(a.client);
        room.addClient(b.client);
        room.startGame(2);
        a.sent.length = 0;
        b.sent.length = 0;

        // Player 2 (client b) presses NORTH — Engine steps that player on the input change.
        room.applyInput(b.client, { type: 'input', direction: 'NORTH' });
        vi.advanceTimersByTime(SIM_TICK_MS);

        const snap = [...b.sent].reverse().find((m) => m.type === 'snapshot');
        expect(snap && snap.type === 'snapshot').toBe(true);
        if (snap && snap.type === 'snapshot') {
            const p1 = snap.snapshot.players[0];
            const p2 = snap.snapshot.players[1];
            expect(p2.position).not.toEqual(p2.spawn.position); // p2 moved
            expect(p1.position).toEqual(p1.spawn.position); // p1 did not
        }
    });

    it('ignores input from a client that is not in the room', () => {
        const room = new Room('r1');
        const a = makeClient();
        const stranger = makeClient();
        room.addClient(a.client);
        room.startGame(1);
        expect(() => room.applyInput(stranger.client, { type: 'input', fire: true })).not.toThrow();
    });
});
