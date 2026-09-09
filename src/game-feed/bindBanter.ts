import type { GameController } from '../engine/GameController';
import type { AppDispatch } from '../store/store';
import { showBanter, clearBanter } from './feedSlice';
import { makePicker } from './pickLine';
import banter from '../assets/banter/banter.json';

/** How long a banner stays on screen. Cosmetic — wall-clock, not sim ticks. */
export const BANNER_MS = 3000;
/** 3+ kills inside this window promote "kill" → "streak". */
export const STREAK_WINDOW_MS = 4000;

/**
 * Subscribes arcade callout banners to engine events — the text counterpart to
 * `audioManager.bindEngine`. Works for the local `Engine` and the
 * `NetworkGameClient` alike (both re-emit the same events). Returns an
 * unsubscribe fn; call it on cleanup.
 */
export const bindBanter = (controller: GameController, dispatch: AppDispatch): (() => void) => {
    const pick = makePicker(banter);
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    let killTimes: number[] = [];

    const show = (category: string) => {
        const text = pick(category);
        if (!text) return;
        dispatch(showBanter(text));
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => dispatch(clearBanter()), BANNER_MS);
    };

    const unsubscribe = controller.on((event) => {
        switch (event.type) {
            case 'tankDestroyed': {
                const now = Date.now();
                killTimes = killTimes.filter((t) => now - t < STREAK_WINDOW_MS);
                killTimes.push(now);
                show(killTimes.length >= 3 ? 'streak' : 'kill');
                break;
            }
            case 'shortOfTime':
                show('lowTime');
                break;
            case 'eagleDestroyed':
                show('eagleLost');
                break;
            case 'starCollected':
                show('star');
                break;
            case 'powerupCollected':
                show('powerup');
                break;
            case 'playerRespawned':
                show('respawn');
                break;
            case 'levelChanged':
                // `beginLevel` fires this on level 0 too (right after gameStarted) —
                // only celebrate an actual advance.
                if (event.levelIndex > 0) show('levelUp');
                break;
        }
    });

    return () => {
        unsubscribe();
        if (clearTimer) clearTimeout(clearTimer);
    };
};
