import { describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioManager';
import { EngineEventBus } from '../engine/events';

describe('AudioManager', () => {
    it('setVolumes applies to the bg element and every cached effect element', () => {
        const manager = new AudioManager();
        manager.setVolumes(0.4, 0.7);
        manager.playBg('main');
        manager.playEffect('click');

        expect(manager['bgAudio'].volume).toBe(0.4);
        expect(manager['effectAudio'].click.volume).toBe(0.7);
        expect(manager['effectAudio'].crash.volume).toBe(0.7);
    });

    it('playBg swapping tracks updates src and loop, and re-selecting the same track is a no-op', () => {
        const manager = new AudioManager();
        const playSpy = vi.spyOn(manager['bgAudio'], 'play').mockResolvedValue();

        manager.playBg('main');
        expect(manager['bgAudio'].loop).toBe(true);
        expect(playSpy).toHaveBeenCalledTimes(1);

        manager.playBg('main'); // same track again
        expect(playSpy).toHaveBeenCalledTimes(1); // not re-triggered

        manager.playBg('win');
        expect(manager['bgAudio'].loop).toBe(false);
        expect(playSpy).toHaveBeenCalledTimes(2);
    });

    it('stopBg pauses and resets the bg element', () => {
        const manager = new AudioManager();
        vi.spyOn(manager['bgAudio'], 'play').mockResolvedValue();
        const pauseSpy = vi.spyOn(manager['bgAudio'], 'pause').mockImplementation(() => {});

        manager.playBg('main');
        manager.stopBg();

        expect(pauseSpy).toHaveBeenCalled();
    });

    it('playEffect restarts the cached element from 0 so rapid re-triggers replay cleanly', () => {
        const manager = new AudioManager();
        const audio = manager['effectAudio'].click;
        const playSpy = vi.spyOn(audio, 'play').mockResolvedValue();
        audio.currentTime = 5;

        manager.playEffect('click');

        expect(audio.currentTime).toBe(0);
        expect(playSpy).toHaveBeenCalledTimes(1);
    });

    it('bindEngine routes bulletFired/tankDestroyed/playerHit/starCollected to the right effects', () => {
        const manager = new AudioManager();
        const playEffectSpy = vi.spyOn(manager, 'playEffect');
        const bus = new EngineEventBus();
        manager.bindEngine({ on: listener => bus.on(listener) });

        bus.emit({ type: 'bulletFired', keyIndex: 'b1', isPlayerBullet: true });
        bus.emit({ type: 'bulletFired', keyIndex: 'b2', isPlayerBullet: false });
        bus.emit({ type: 'tankDestroyed', keyIndex: 1, position: [0, 0] });
        bus.emit({ type: 'playerHit' });
        bus.emit({ type: 'starCollected' });
        bus.emit({ type: 'powerupCollected', kind: 'invincibility' });
        bus.emit({ type: 'mapChanged' }); // unrelated event, should not trigger anything

        expect(playEffectSpy.mock.calls).toEqual([
            ['shootPlayer'],
            ['shootTank'],
            ['crash'],
            ['crash'],
            ['findStar'],
            ['findStar'],
        ]);
    });

    it('bindEngine returns an unsubscribe function', () => {
        const manager = new AudioManager();
        const playEffectSpy = vi.spyOn(manager, 'playEffect');
        const bus = new EngineEventBus();
        const unsubscribe = manager.bindEngine({ on: listener => bus.on(listener) });

        unsubscribe();
        bus.emit({ type: 'starCollected' });

        expect(playEffectSpy).not.toHaveBeenCalled();
    });
});
