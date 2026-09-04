import { GameLoop } from './GameLoop';
import type { GameLoopOptions } from './GameLoop';
import { ROOM_CAPACITY, encode } from '../../src/net/protocol';
import type { InputMessage, ServerMessage } from '../../src/net/protocol';

/** The server's minimal view of one connected client — a real `ws` socket in
 * production, a fake in tests. */
export interface RoomClient {
    send(raw: string): void;
}

/**
 * One game room: wraps a single `GameLoop`, tracks up to `ROOM_CAPACITY`
 * client sockets by player slot, and — while a game is running — broadcasts
 * the authoritative snapshot every tick plus every engine event. The room is
 * the only thing that ever calls `GameLoop.applyInput`, so a client can only
 * ever move its own tank.
 */
export class Room {
    readonly id: string;
    private readonly loop: GameLoop;
    private readonly slots: (RoomClient | null)[] = Array.from({ length: ROOM_CAPACITY }, () => null);
    private unsubTick: (() => void) | null = null;
    private unsubEvent: (() => void) | null = null;

    constructor(id: string, loopOptions?: GameLoopOptions) {
        this.id = id;
        this.loop = new GameLoop(loopOptions);
    }

    get isEmpty(): boolean {
        return this.slots.every((s) => s === null);
    }

    get isFull(): boolean {
        return this.slots.every((s) => s !== null);
    }

    get occupiedSlots(): number[] {
        return this.slots.flatMap((s, i) => (s === null ? [] : [i]));
    }

    get isRunning(): boolean {
        return this.loop.isRunning;
    }

    /** Assigns the lowest free slot to `client`. Returns the player id, or
     * null if the room is full. Also tells everyone already in the room that a
     * peer connected, and — if a game is already in progress — sends the new
     * client the current snapshot immediately so it isn't blank until the
     * next tick. */
    addClient(client: RoomClient): number | null {
        const slot = this.slots.findIndex((s) => s === null);
        if (slot === -1) return null;
        this.slots[slot] = client;

        this.broadcastExcept(client, { type: 'peer', playerId: slot, connected: true });
        if (this.loop.isRunning) {
            client.send(encode({ type: 'snapshot', serverTick: this.loop.currentTick, snapshot: this.loop.getSnapshot() }));
        }
        return slot;
    }

    /** Frees whatever slot `client` held. Notifies remaining peers. Disposes
     * the room's game loop once the room is empty. Returns the freed slot, or
     * -1 if the client wasn't in this room. */
    removeClient(client: RoomClient): number {
        const slot = this.slots.findIndex((s) => s === client);
        if (slot === -1) return -1;
        this.slots[slot] = null;
        this.broadcast({ type: 'peer', playerId: slot, connected: false });
        if (this.isEmpty) this.dispose();
        return slot;
    }

    slotOf(client: RoomClient): number {
        return this.slots.findIndex((s) => s === client);
    }

    /** Starts (or restarts) the game and begins per-tick broadcasting. */
    startGame(playerCount: 1 | 2 = 2): void {
        this.unsubTick?.();
        this.unsubEvent?.();

        this.unsubEvent = this.loop.onEvent((event) => {
            this.broadcast({ type: 'event', event });
        });
        this.unsubTick = this.loop.onTick((serverTick) => {
            this.broadcast({ type: 'snapshot', serverTick, snapshot: this.loop.getSnapshot() });
        });
        this.loop.start(playerCount);
    }

    applyInput(client: RoomClient, input: InputMessage): void {
        const slot = this.slotOf(client);
        if (slot === -1) return;
        this.loop.applyInput(slot, { direction: input.direction, fire: input.fire });
    }

    togglePause(): void {
        this.loop.togglePause();
    }

    /** Stops the loop and detaches listeners. Called automatically when the
     * last client leaves; also called by the registry on shutdown. */
    dispose(): void {
        this.unsubTick?.();
        this.unsubEvent?.();
        this.unsubTick = null;
        this.unsubEvent = null;
        this.loop.stop();
    }

    private broadcast(message: ServerMessage): void {
        const raw = encode(message);
        for (const client of this.slots) client?.send(raw);
    }

    private broadcastExcept(exclude: RoomClient, message: ServerMessage): void {
        const raw = encode(message);
        for (const client of this.slots) {
            if (client && client !== exclude) client.send(raw);
        }
    }
}
