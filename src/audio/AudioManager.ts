import bgm from '../assets/sounds/bgm.mp3';
import game_start_bgm from '../assets/sounds/game_start_bgm.mp3';
import game_over_bgm from '../assets/sounds/game_over_bgm.mp3';
import game_win_bgm from '../assets/sounds/game_win_bgm.mp3';
import short_of_time_bgm from '../assets/sounds/short_of_time_bgm.mp3';
import click from '../assets/sounds/click.mp3';
import crash from '../assets/sounds/crash.mp3';
import find_star from '../assets/sounds/find_star.mp3';
import shoot_by_player from '../assets/sounds/shoot_by_player11.mp3';
import shoot_by_tank from '../assets/sounds/shoot_by_tank.mp3';
import type { Engine } from '../engine/Engine';

export type BgTrack = 'start' | 'main' | 'shortOfTime' | 'win' | 'lose' | 'none';
export type EffectKey = 'click' | 'crash' | 'findStar' | 'shootPlayer' | 'shootTank';

const BG_SOURCES: Record<Exclude<BgTrack, 'none'>, string> = {
    start: game_start_bgm,
    main: bgm,
    shortOfTime: short_of_time_bgm,
    win: game_win_bgm,
    lose: game_over_bgm,
};

// main/shortOfTime are continuous background loops; start/win/lose are
// one-shot stingers, matching how each was actually used (when it was wired
// up at all) in the DOM version.
const BG_LOOPS: Record<Exclude<BgTrack, 'none'>, boolean> = {
    start: false,
    main: true,
    shortOfTime: true,
    win: false,
    lose: false,
};

const EFFECT_SOURCES: Record<EffectKey, string> = {
    click,
    crash,
    findStar: find_star,
    shootPlayer: shoot_by_player,
    shootTank: shoot_by_tank,
};

/**
 * Sole owner of every `HTMLAudioElement` in the app (plan bug #13, replacing
 * the DOM version's scattered `new Audio()` calls and the `useAudio` hook
 * that gave every component its own independent instance). One shared
 * element for background music, its source swapped between tracks so at
 * most one bg track ever plays at once — the DOM version had World *and*
 * GameResult each independently start their own `game_win_bgm` on a win,
 * so it audibly played twice at once. One cached element per sound effect,
 * reused across calls (`playEffect` restarts from 0 so rapid re-triggers,
 * e.g. mashing fire, still sound distinct rather than queuing up).
 *
 * Also the fix for the "no explosion sound" gap found during M0
 * playtesting: `crash` was imported in the original `bullet.component.jsx`
 * but every `new Audio(crash).play()` call site was commented out — it
 * never actually played. `bindEngine` wires it to the `tankDestroyed`/
 * `playerHit` events for real.
 */
export class AudioManager {
    private bgAudio = new Audio();
    private currentBgTrack: BgTrack = 'none';
    private effectAudio: Record<EffectKey, HTMLAudioElement>;
    private bgVolume = 1;
    private effectVolume = 1;

    constructor() {
        this.effectAudio = Object.fromEntries(
            (Object.keys(EFFECT_SOURCES) as EffectKey[]).map(key => [key, new Audio(EFFECT_SOURCES[key])]),
        ) as Record<EffectKey, HTMLAudioElement>;
    }

    setVolumes(bgVolume: number, effectVolume: number): void {
        this.bgVolume = bgVolume;
        this.effectVolume = effectVolume;
        this.bgAudio.volume = bgVolume;
        for (const key of Object.keys(this.effectAudio) as EffectKey[]) {
            this.effectAudio[key].volume = effectVolume;
        }
    }

    playBg(track: BgTrack): void {
        if (track === this.currentBgTrack) return;
        this.currentBgTrack = track;
        if (track === 'none') {
            this.bgAudio.pause();
            this.bgAudio.currentTime = 0;
            return;
        }
        this.bgAudio.src = BG_SOURCES[track];
        this.bgAudio.loop = BG_LOOPS[track];
        this.bgAudio.volume = this.bgVolume;
        this.bgAudio.currentTime = 0;
        void this.bgAudio.play();
    }

    stopBg(): void {
        this.playBg('none');
    }

    playEffect(key: EffectKey): void {
        const audio = this.effectAudio[key];
        audio.volume = this.effectVolume;
        audio.currentTime = 0;
        void audio.play();
    }

    /** Subscribes sound effects to Engine events; returns the unsubscribe fn. */
    bindEngine(engine: Pick<Engine, 'on'>): () => void {
        return engine.on(event => {
            switch (event.type) {
                case 'bulletFired':
                    this.playEffect(event.isPlayerBullet ? 'shootPlayer' : 'shootTank');
                    break;
                case 'tankDestroyed':
                case 'playerHit':
                    this.playEffect('crash');
                    break;
                case 'starCollected':
                    this.playEffect('findStar');
                    break;
                default:
                    break;
            }
        });
    }
}

export const audioManager = new AudioManager();
