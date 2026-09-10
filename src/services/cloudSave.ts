import type { GameController } from '../engine/GameController';
import { clearSave, saveProgress } from './api';

/**
 * Mirrors a *local* run to the cloud-save endpoint so it can be resumed later:
 *  - checkpoint on every `levelChanged` past level 0 (i.e. a level was cleared),
 *  - clear the save when the run ends (`gameLost`, or `gameWon` on the last level).
 *
 * Online games are not saved (the server owns room state) — `World` only binds
 * this for a local `Engine`. Returns an unsubscribe fn.
 */
export const bindCloudSave = (controller: GameController, playerKey: string): (() => void) => {
    return controller.on((event) => {
        if (event.type === 'levelChanged') {
            if (event.levelIndex <= 0) return;
            const s = controller.getSnapshot();
            void saveProgress(playerKey, {
                levelIndex: s.levelIndex,
                lives: s.players[0].lives,
                score: s.score,
            }).catch(() => undefined);
        } else if (event.type === 'gameLost') {
            void clearSave(playerKey);
        } else if (event.type === 'gameWon') {
            const s = controller.getSnapshot();
            if (s.levelIndex >= s.totalLevels - 1) void clearSave(playerKey);
        }
    });
};
