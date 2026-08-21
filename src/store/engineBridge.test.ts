import { describe, expect, it, vi } from 'vitest';
import { engineBridge } from './engineBridge';
import { setStatus, setShortOfTime } from './worldSlice';
import { setTimeRemaining, setEnemiesRemaining, resetHud } from './hudSlice';
import { TIME_LIMIT_SEC } from '../engine/constants';
import type { Engine } from '../engine/Engine';
import type { EngineEvent, EngineEventListener } from '../engine/events';

/** A minimal fake standing in for `Engine` — engineBridge only ever calls
 * `.on()`, so that's all this needs to implement. */
const makeFakeEngine = () => {
    let listener: EngineEventListener | null = null;
    return {
        engine: {
            on: (l: EngineEventListener) => {
                listener = l;
                return () => { listener = null; };
            },
        } as unknown as Engine,
        emit: (event: EngineEvent) => listener?.(event),
    };
};

describe('engineBridge', () => {
    it('translates gameStarted into a hud reset + status change', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'gameStarted' });

        expect(dispatch).toHaveBeenCalledWith(resetHud());
        expect(dispatch).toHaveBeenCalledWith(setTimeRemaining(TIME_LIMIT_SEC));
        expect(dispatch).toHaveBeenCalledWith(setShortOfTime(false));
        expect(dispatch).toHaveBeenCalledWith(setStatus('playing'));
    });

    it('translates gameReset back to menu status', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'gameReset' });

        expect(dispatch).toHaveBeenCalledWith(setStatus('menu'));
    });

    it('translates gameWon/gameLost into the matching status', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'gameWon' });
        expect(dispatch).toHaveBeenCalledWith(setStatus('won'));

        emit({ type: 'gameLost' });
        expect(dispatch).toHaveBeenCalledWith(setStatus('lost'));
    });

    it('translates gamePaused/gameResumed into the matching status', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'gamePaused' });
        expect(dispatch).toHaveBeenCalledWith(setStatus('paused'));

        emit({ type: 'gameResumed' });
        expect(dispatch).toHaveBeenCalledWith(setStatus('playing'));
    });

    it('mirrors timeTick and shortOfTime', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'timeTick', timeRemainingSec: 42 });
        expect(dispatch).toHaveBeenCalledWith(setTimeRemaining(42));

        emit({ type: 'shortOfTime' });
        expect(dispatch).toHaveBeenCalledWith(setShortOfTime(true));
    });

    it('tracks enemiesRemaining across spawn waves and kills', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        engineBridge(engine, dispatch);

        emit({ type: 'tankSpawned', keyIndex: 1, position: [0, 0] });
        emit({ type: 'tankSpawned', keyIndex: 2, position: [0, 0] });
        emit({ type: 'tankSpawned', keyIndex: 3, position: [0, 0] });
        expect(dispatch).toHaveBeenLastCalledWith(setEnemiesRemaining(3));

        emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });
        expect(dispatch).toHaveBeenLastCalledWith(setEnemiesRemaining(2));
    });

    it('unsubscribes via the returned function', () => {
        const { engine, emit } = makeFakeEngine();
        const dispatch = vi.fn();
        const unsubscribe = engineBridge(engine, dispatch);

        unsubscribe();
        emit({ type: 'gameWon' });
        expect(dispatch).not.toHaveBeenCalled();
    });
});
