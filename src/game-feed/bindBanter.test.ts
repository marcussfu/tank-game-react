import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindBanter, BANNER_MS } from './bindBanter';
import { showBanter, clearBanter } from './feedSlice';
import { EngineEventBus } from '../engine/events';
import type { GameController } from '../engine/GameController';
import banter from '../assets/banter/banter.json';

const setup = () => {
    const bus = new EngineEventBus();
    const controller = { on: bus.on.bind(bus) } as unknown as GameController;
    const dispatch = vi.fn();
    const unbind = bindBanter(controller, dispatch);
    return { bus, dispatch, unbind };
};

const lastBannerText = (dispatch: ReturnType<typeof vi.fn>): string | undefined => {
    const calls = dispatch.mock.calls.map((c) => c[0]);
    const shows = calls.filter((a) => a.type === showBanter.type);
    return shows.length ? shows[shows.length - 1].payload : undefined;
};

describe('bindBanter', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('shows a kill line on tankDestroyed and auto-clears after BANNER_MS', () => {
        const { bus, dispatch } = setup();
        bus.emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });

        expect(banter.kill).toContain(lastBannerText(dispatch));
        expect(dispatch).not.toHaveBeenCalledWith(clearBanter());

        vi.advanceTimersByTime(BANNER_MS);
        expect(dispatch).toHaveBeenCalledWith(clearBanter());
    });

    it('promotes to a streak line on the 3rd kill within the window', () => {
        const { bus, dispatch } = setup();
        bus.emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });
        bus.emit({ type: 'tankDestroyed', keyIndex: 2, position: [0, 0] });
        expect(banter.kill).toContain(lastBannerText(dispatch));

        bus.emit({ type: 'tankDestroyed', keyIndex: 3, position: [0, 0] });
        expect(banter.streak).toContain(lastBannerText(dispatch));
    });

    it('does not promote when the kills are spread out past the window', () => {
        const { bus, dispatch } = setup();
        bus.emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });
        vi.advanceTimersByTime(5000);
        bus.emit({ type: 'tankDestroyed', keyIndex: 2, position: [0, 0] });
        vi.advanceTimersByTime(5000);
        bus.emit({ type: 'tankDestroyed', keyIndex: 3, position: [0, 0] });
        expect(banter.kill).toContain(lastBannerText(dispatch));
    });

    it('maps the other gameplay events to their categories', () => {
        const cases: [Parameters<EngineEventBus['emit']>[0], keyof typeof banter][] = [
            [{ type: 'shortOfTime' }, 'lowTime'],
            [{ type: 'eagleDestroyed' }, 'eagleLost'],
            [{ type: 'starCollected' }, 'star'],
            [{ type: 'powerupCollected', kind: 'freeze' }, 'powerup'],
            [{ type: 'playerRespawned', playerId: 0 }, 'respawn'],
            [{ type: 'levelChanged', levelIndex: 1, totalLevels: 2 }, 'levelUp'],
        ];
        for (const [event, category] of cases) {
            const { bus, dispatch, unbind } = setup();
            bus.emit(event);
            expect(banter[category], `event ${event.type}`).toContain(lastBannerText(dispatch));
            unbind();
        }
    });

    it('ignores the level-0 levelChanged that fires right after gameStarted', () => {
        const { bus, dispatch } = setup();
        bus.emit({ type: 'levelChanged', levelIndex: 0, totalLevels: 2 });
        expect(lastBannerText(dispatch)).toBeUndefined();
    });

    it('stops dispatching after unbind', () => {
        const { bus, dispatch, unbind } = setup();
        unbind();
        bus.emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });
        expect(dispatch).not.toHaveBeenCalled();
    });
});
