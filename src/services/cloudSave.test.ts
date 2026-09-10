import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindCloudSave } from './cloudSave';
import * as apiModule from './api';
import { EngineEventBus } from '../engine/events';
import { emptySnapshot } from '../engine/emptySnapshot';
import type { GameController } from '../engine/GameController';
import type { EngineSnapshot } from '../engine/types';

const setup = (snapshot: () => EngineSnapshot) => {
    const bus = new EngineEventBus();
    const controller = { on: bus.on.bind(bus), getSnapshot: snapshot } as unknown as GameController;
    return { bus, unbind: bindCloudSave(controller, 'key-1') };
};

describe('bindCloudSave', () => {
    afterEach(() => vi.restoreAllMocks());

    it('checkpoints on a levelChanged past level 0', () => {
        const save = vi.spyOn(apiModule, 'saveProgress').mockResolvedValue({} as never);
        const { bus } = setup(() => ({ ...emptySnapshot(), levelIndex: 2, score: 1500, players: emptySnapshot().players }));

        bus.emit({ type: 'levelChanged', levelIndex: 2, totalLevels: 3 });
        expect(save).toHaveBeenCalledWith('key-1', { levelIndex: 2, lives: 3, score: 1500 });
    });

    it('does not checkpoint the level-0 levelChanged', () => {
        const save = vi.spyOn(apiModule, 'saveProgress');
        const { bus } = setup(() => emptySnapshot());
        bus.emit({ type: 'levelChanged', levelIndex: 0, totalLevels: 3 });
        expect(save).not.toHaveBeenCalled();
    });

    it('clears the save on a loss', () => {
        const clear = vi.spyOn(apiModule, 'clearSave').mockResolvedValue();
        const { bus } = setup(() => emptySnapshot());
        bus.emit({ type: 'gameLost' });
        expect(clear).toHaveBeenCalledWith('key-1');
    });

    it('clears the save on a final win, but not on a mid-run win', () => {
        const clear = vi.spyOn(apiModule, 'clearSave').mockResolvedValue();

        const midRun = setup(() => ({ ...emptySnapshot(), levelIndex: 0, totalLevels: 3 }));
        midRun.bus.emit({ type: 'gameWon' });
        expect(clear).not.toHaveBeenCalled();
        midRun.unbind();

        const finalWin = setup(() => ({ ...emptySnapshot(), levelIndex: 2, totalLevels: 3 }));
        finalWin.bus.emit({ type: 'gameWon' });
        expect(clear).toHaveBeenCalledWith('key-1');
    });

    it('stops after unbind', () => {
        const save = vi.spyOn(apiModule, 'saveProgress');
        const { bus, unbind } = setup(() => ({ ...emptySnapshot(), levelIndex: 1 }));
        unbind();
        bus.emit({ type: 'levelChanged', levelIndex: 1, totalLevels: 3 });
        expect(save).not.toHaveBeenCalled();
    });
});
