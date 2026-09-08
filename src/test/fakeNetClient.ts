import { vi } from 'vitest';
import type { NetworkGameClient, NetState } from '../net/NetworkGameClient';

const baseState: NetState = {
    phase: 'lobby',
    playerId: 0,
    roomId: 'default',
    peerConnected: false,
    latencyMs: null,
    reconnectAttempt: 0,
};

/** A test double for `NetworkGameClient` — implements just the surface the
 * lobby / HUD components touch, with a controllable `NetState`. */
export const makeFakeNetClient = (state: Partial<NetState> = {}) => {
    const listeners = new Set<(s: NetState) => void>();
    let current: NetState = { ...baseState, ...state };

    const fake = {
        netState: () => current,
        onNetState: (fn: (s: NetState) => void) => {
            listeners.add(fn);
            fn(current);
            return () => listeners.delete(fn);
        },
        start: vi.fn(),
        returnToMenu: vi.fn(),
        // test-only: push a new state to subscribers
        _set: (next: Partial<NetState>) => {
            current = { ...current, ...next };
            for (const fn of listeners) fn(current);
        },
    };
    return fake as typeof fake & NetworkGameClient;
};
