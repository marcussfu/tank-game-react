import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import { Room } from './Room';
import type { RoomClient } from './Room';
import type { GameLoopOptions } from './GameLoop';
import {
    DEFAULT_ROOM_ID,
    PROTOCOL_VERSION,
    decodeClientMessage,
    encode,
} from '../../src/net/protocol';
import type { ServerMessage } from '../../src/net/protocol';

export interface GameServerOptions {
    /** TCP port. 0 (the default in tests) picks a free ephemeral port.
     * Ignored when `server` is set. */
    port?: number;
    /** An already-listening HTTP server to attach WebSocket upgrade handling
     * to, so the game socket and the REST API share one port (needed by
     * single-port deploy targets). When omitted, `listen()` opens its own
     * standalone port instead — used by every test in this file/`Room.test.ts`. */
    server?: HttpServer;
    /** Path to accept WS upgrades on. Only meaningful with `server`. */
    path?: string;
    /** Forwarded to every room's GameLoop — tests pass a small tickMs. */
    loopOptions?: GameLoopOptions;
}

interface ConnState {
    /** Stable per-connection identity handed to `Room` (its slot bookkeeping
     * compares by reference). */
    adapter: RoomClient;
    room: Room | null;
}

/**
 * The WebSocket front door. Owns the room registry; every inbound message is
 * validated here and routed to the sender's room. A socket does nothing until
 * it sends `join`. Rooms auto-start a 2-player game once both slots fill and
 * auto-dispose when their last client leaves.
 */
export class GameServer {
    private readonly options: GameServerOptions;
    private wss: WebSocketServer | null = null;
    private readonly rooms = new Map<string, Room>();
    private readonly conns = new Map<WebSocket, ConnState>();

    constructor(options: GameServerOptions = {}) {
        this.options = options;
    }

    /** Starts listening (or, given `server`, attaches to it). Resolves with
     * the bound port. */
    listen(): Promise<number> {
        if (this.options.server) {
            const wss = new WebSocketServer({ server: this.options.server, path: this.options.path });
            this.wss = wss;
            wss.on('connection', (socket) => this.onConnection(socket));
            const addr = this.options.server.address();
            return Promise.resolve(typeof addr === 'object' && addr ? addr.port : 0);
        }
        return new Promise((resolve, reject) => {
            const wss = new WebSocketServer({ port: this.options.port ?? 0 });
            this.wss = wss;
            wss.on('error', reject);
            wss.on('listening', () => {
                resolve((wss.address() as AddressInfo).port);
            });
            wss.on('connection', (socket) => this.onConnection(socket));
        });
    }

    /** Closes every socket, disposes every room, and stops listening. */
    close(): Promise<void> {
        for (const room of this.rooms.values()) room.dispose();
        this.rooms.clear();
        for (const socket of this.conns.keys()) socket.close();
        this.conns.clear();
        return new Promise((resolve) => {
            if (!this.wss) return resolve();
            this.wss.close(() => resolve());
            this.wss = null;
        });
    }

    get roomCount(): number {
        return this.rooms.size;
    }

    private onConnection(socket: WebSocket): void {
        const adapter: RoomClient = {
            send: (raw) => {
                if (socket.readyState === socket.OPEN) socket.send(raw);
            },
        };
        this.conns.set(socket, { adapter, room: null });

        socket.on('message', (data) => this.onMessage(socket, data.toString()));
        socket.on('close', () => this.onDisconnect(socket));
        socket.on('error', () => this.onDisconnect(socket));
    }

    private send(socket: WebSocket, message: ServerMessage): void {
        if (socket.readyState === socket.OPEN) socket.send(encode(message));
    }

    private onMessage(socket: WebSocket, raw: string): void {
        const state = this.conns.get(socket);
        if (!state) return;

        const message = decodeClientMessage(raw);
        if (!message) {
            this.send(socket, { type: 'error', code: 'bad-message', message: 'unparseable message' });
            return;
        }

        switch (message.type) {
            case 'join': {
                if (message.protocolVersion !== PROTOCOL_VERSION) {
                    this.send(socket, {
                        type: 'error',
                        code: 'bad-protocol',
                        message: `server speaks protocol ${PROTOCOL_VERSION}, client sent ${message.protocolVersion}`,
                    });
                    return;
                }
                if (state.room) {
                    this.send(socket, { type: 'error', code: 'already-joined', message: 'already in a room' });
                    return;
                }
                const roomId = message.roomId ?? DEFAULT_ROOM_ID;
                const room = this.rooms.get(roomId) ?? new Room(roomId, this.options.loopOptions);
                const playerId = room.addClient(state.adapter);
                if (playerId === null) {
                    this.send(socket, { type: 'error', code: 'room-full', message: `room "${roomId}" is full` });
                    if (!this.rooms.has(roomId)) room.dispose();
                    return;
                }
                this.rooms.set(roomId, room);
                state.room = room;
                this.send(socket, {
                    type: 'joined',
                    roomId,
                    playerId,
                    occupiedSlots: room.occupiedSlots,
                    gameRunning: room.isRunning,
                });
                // Fill-and-go: a full room with no game in progress starts one.
                if (room.isFull && !room.isRunning) room.startGame(2);
                return;
            }
            case 'start': {
                if (!state.room) return this.notJoined(socket);
                state.room.startGame(message.playerCount ?? 2);
                return;
            }
            case 'input': {
                if (!state.room) return this.notJoined(socket);
                state.room.applyInput(state.adapter, message);
                return;
            }
            case 'togglePause': {
                if (!state.room) return this.notJoined(socket);
                state.room.togglePause();
                return;
            }
            case 'advance': {
                if (!state.room) return this.notJoined(socket);
                state.room.advanceLevel();
                return;
            }
            case 'leave': {
                this.leaveRoom(state);
                return;
            }
            case 'ping': {
                this.send(socket, { type: 'pong', t: message.t });
                return;
            }
        }
    }

    private notJoined(socket: WebSocket): void {
        this.send(socket, { type: 'error', code: 'not-joined', message: 'send a join message first' });
    }

    private leaveRoom(state: ConnState): void {
        if (!state.room) return;
        const room = state.room;
        room.removeClient(state.adapter);
        state.room = null;
        if (room.isEmpty) this.rooms.delete(room.id);
    }

    private onDisconnect(socket: WebSocket): void {
        const state = this.conns.get(socket);
        if (!state) return;
        this.leaveRoom(state);
        this.conns.delete(socket);
    }
}
