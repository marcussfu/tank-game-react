import type { GameController } from '../engine/GameController';
import { TIME_LIMIT_SEC } from '../engine/constants';
import { setStatus, setShortOfTime } from './worldSlice';
import { setTimeRemaining, setEnemiesRemaining, setLevel, setLives, resetHud } from './hudSlice';
import type { AppDispatch } from './store';

/**
 * The sole place that translates Engine events into Redux dispatches — no
 * other component should dispatch `world`/`hud` actions directly. Call once
 * per Engine instance (e.g. in World's mount effect) and call the returned
 * unsubscribe function on cleanup.
 */
export const engineBridge = (engine: GameController, dispatch: AppDispatch): (() => void) => {
    let enemiesRemaining = 0;

    return engine.on(event => {
        switch (event.type) {
            case 'gameStarted':
                enemiesRemaining = 0;
                dispatch(resetHud());
                dispatch(setTimeRemaining(TIME_LIMIT_SEC));
                dispatch(setShortOfTime(false));
                dispatch(setStatus('playing'));
                break;
            case 'gameReset':
                enemiesRemaining = 0;
                dispatch(resetHud());
                dispatch(setShortOfTime(false));
                dispatch(setStatus('menu'));
                break;
            case 'gameWon':
                dispatch(setStatus('won'));
                break;
            case 'gameLost':
                dispatch(setStatus('lost'));
                break;
            case 'gamePaused':
                dispatch(setStatus('paused'));
                break;
            case 'gameResumed':
                dispatch(setStatus('playing'));
                break;
            case 'timeTick':
                dispatch(setTimeRemaining(event.timeRemainingSec));
                break;
            case 'shortOfTime':
                dispatch(setShortOfTime(true));
                break;
            case 'levelChanged':
                dispatch(setLevel({ levelIndex: event.levelIndex, totalLevels: event.totalLevels }));
                break;
            case 'livesChanged':
                dispatch(setLives({ playerId: event.playerId, lives: event.lives }));
                break;
            case 'tankSpawned':
                enemiesRemaining += 1;
                dispatch(setEnemiesRemaining(enemiesRemaining));
                break;
            case 'tankDestroyed':
                enemiesRemaining = Math.max(0, enemiesRemaining - 1);
                dispatch(setEnemiesRemaining(enemiesRemaining));
                break;
            default:
                break;
        }
    });
};
