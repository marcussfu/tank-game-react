import type { Direction, EngineSnapshot } from '../engine/types';
import type { EngineEvent } from '../engine/events';

/** Bumped whenever the message shapes below change incompatibly. Client and
 * server compare this on join and refuse a mismatch. */
export const PROTOCOL_VERSION = 1;

/** Default room used when a client joins without naming one. */
export const DEFAULT_ROOM_ID = 'default';

/** Max players per room (local co-op is 2). */
export const ROOM_CAPACITY = 2;

// ---- client -> server ----

export interface JoinMessage {
    type: 'join';
    protocolVersion: number;
    /** Room to join or create. Defaults to DEFAULT_ROOM_ID server-side. */
    roomId?: string;
}

/** Start (or restart) the room's game. Any player in the room may send it;
 * `playerCount` lets a lone player start a solo game without waiting. */
export interface StartMessage {
    type: 'start';
    playerCount?: 1 | 2;
}

/** One player's intent. `direction` omitted = unchanged; `''` = stop. */
export interface InputMessage {
    type: 'input';
    direction?: Direction | '';
    fire?: boolean;
}

export interface TogglePauseMessage {
    type: 'togglePause';
}

/** Move on to the next level after a stage-clear win (mirrors the local
 * `GameResult` "STAGE CLEAR" → `engine.advanceLevel()` flow). */
export interface AdvanceMessage {
    type: 'advance';
}

export interface LeaveMessage {
    type: 'leave';
}

export type ClientMessage =
    | JoinMessage
    | StartMessage
    | InputMessage
    | TogglePauseMessage
    | AdvanceMessage
    | LeaveMessage;

// ---- server -> client ----

/** Sent once, right after a successful join: your seat in the room. */
export interface JoinedMessage {
    type: 'joined';
    roomId: string;
    /** This client's player slot — the id to expect in snapshots. */
    playerId: number;
    /** Which slots are currently occupied (0/1). */
    occupiedSlots: number[];
}

/** A peer joined or left the room. */
export interface PeerMessage {
    type: 'peer';
    playerId: number;
    connected: boolean;
}

/** The authoritative world state — broadcast every server tick. */
export interface SnapshotMessage {
    type: 'snapshot';
    /** Monotonic server tick counter, for client-side ordering/interpolation. */
    serverTick: number;
    snapshot: EngineSnapshot;
}

/** An engine-level event (tank destroyed, level changed, …) for client
 * sound/visual effects — the client can't derive these from snapshot diffs
 * reliably. */
export interface EventMessage {
    type: 'event';
    event: EngineEvent;
}

export interface ErrorMessage {
    type: 'error';
    /** Machine-readable reason, e.g. 'room-full', 'bad-protocol', 'not-joined'. */
    code: string;
    message: string;
}

export type ServerMessage =
    | JoinedMessage
    | PeerMessage
    | SnapshotMessage
    | EventMessage
    | ErrorMessage;

// ---- helpers ----

export const encode = (message: ServerMessage | ClientMessage): string => JSON.stringify(message);

export const decodeClientMessage = (raw: string): ClientMessage | null => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
            return parsed as ClientMessage;
        }
        return null;
    } catch {
        return null;
    }
};

export const decodeServerMessage = (raw: string): ServerMessage | null => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
            return parsed as ServerMessage;
        }
        return null;
    } catch {
        return null;
    }
};
