import { describe, expect, it } from 'vitest';
import { interpolateSnapshot } from './interpolate';
import { emptySnapshot } from '../engine/emptySnapshot';
import type { EngineSnapshot } from '../engine/types';

const withEntities = (over: Partial<EngineSnapshot>): EngineSnapshot => ({ ...emptySnapshot(2), ...over });

describe('interpolateSnapshot', () => {
    it('returns latest unchanged when there is no previous snapshot', () => {
        const latest = withEntities({});
        expect(interpolateSnapshot(null, latest, 0.5)).toBe(latest);
    });

    it('returns latest unchanged at alpha >= 1', () => {
        const prev = withEntities({});
        const latest = withEntities({});
        expect(interpolateSnapshot(prev, latest, 1)).toBe(latest);
        expect(interpolateSnapshot(prev, latest, 2)).toBe(latest);
    });

    it('lerps a tank position halfway at alpha 0.5', () => {
        const tank = (position: [number, number]) => ({
            keyIndex: 7, position, direction: 'NORTH' as const, fireTick: 0, moveTickAccumulator: 0,
        });
        const prev = withEntities({ tanks: [tank([0, 0])] });
        const latest = withEntities({ tanks: [tank([100, 40])] });

        const out = interpolateSnapshot(prev, latest, 0.5);
        expect(out.tanks[0].position).toEqual([50, 20]);
        expect(out.tanks[0].direction).toBe('NORTH'); // non-positional fields from latest
    });

    it('clamps a negative alpha to 0 (renders prev positions)', () => {
        const player = (position: [number, number], id = 0) => ({
            ...emptySnapshot(2).players[id], position,
        });
        const prev = withEntities({ players: [player([10, 10], 0), player([20, 20], 1)] });
        const latest = withEntities({ players: [player([90, 90], 0), player([20, 20], 1)] });

        const out = interpolateSnapshot(prev, latest, -3);
        expect(out.players[0].position).toEqual([10, 10]);
    });

    it('does not interpolate a brand-new entity — it pops in at its latest position', () => {
        const bullet = (keyIndex: string, position: [number, number]) => ({
            keyIndex, position, direction: 'SOUTH' as const, isPlayerBullet: true,
        });
        const prev = withEntities({ bullets: [] });
        const latest = withEntities({ bullets: [bullet('b1', [300, 300])] });

        const out = interpolateSnapshot(prev, latest, 0.5);
        expect(out.bullets[0].position).toEqual([300, 300]);
    });

    it('does not move a hidden player', () => {
        const base = emptySnapshot(2);
        const prev = withEntities({ players: [{ ...base.players[0], position: [0, 0] }, base.players[1]] });
        const latest = withEntities({ players: [{ ...base.players[0], position: [80, 0], hidden: true }, base.players[1]] });

        const out = interpolateSnapshot(prev, latest, 0.5);
        expect(out.players[0].position).toEqual([80, 0]); // straight from latest
    });

    it('keeps the player alias pointing at players[0]', () => {
        const base = emptySnapshot(2);
        const prev = withEntities({ players: [{ ...base.players[0], position: [0, 0] }, base.players[1]] });
        const latest = withEntities({ players: [{ ...base.players[0], position: [100, 0] }, base.players[1]] });

        const out = interpolateSnapshot(prev, latest, 0.5);
        expect(out.player).toBe(out.players[0]);
        expect(out.player.position).toEqual([50, 0]);
    });
});
