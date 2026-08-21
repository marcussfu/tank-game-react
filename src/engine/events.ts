import type { Position } from './types';

export type EngineEvent =
    | { type: 'gameStarted' }
    | { type: 'gameReset' }
    | { type: 'tankSpawned'; keyIndex: number; position: Position }
    | { type: 'tankDestroyed'; keyIndex: number; position: Position }
    | { type: 'bulletFired'; keyIndex: string; isPlayerBullet: boolean }
    | { type: 'bulletExpired'; keyIndex: string }
    | { type: 'mapChanged' }
    | { type: 'playerHit' }
    | { type: 'starCollected' }
    | { type: 'eagleDestroyed' }
    | { type: 'gameWon' }
    | { type: 'gameLost' }
    | { type: 'timeTick'; timeRemainingSec: number }
    | { type: 'shortOfTime' };

export type EngineEventListener = (event: EngineEvent) => void;

/** Minimal synchronous event emitter — no external dependency needed for this. */
export class EngineEventBus {
    private listeners = new Set<EngineEventListener>();

    on(listener: EngineEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit(event: EngineEvent): void {
        for (const listener of this.listeners) listener(event);
    }
}
