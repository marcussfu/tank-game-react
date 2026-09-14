import { describe, expect, it } from 'vitest';
import { buildHintPrompt } from './prompt';
import { emptySnapshot } from '../../../src/engine/emptySnapshot';
import { SPRITE_SIZE } from '../../../src/engine/constants';

describe('buildHintPrompt', () => {
    it('includes the map legend, time, score, and player status', () => {
        const snap = emptySnapshot();
        const prompt = buildHintPrompt({ ...snap, timeRemainingSec: 42, score: 900 });

        expect(prompt).toContain('MAP');
        expect(prompt).toContain('Time left: 42s');
        expect(prompt).toContain('Score: 900');
        expect(prompt).toContain('P1:');
        expect(prompt).toContain('active');
    });

    it('marks a hidden player as destroyed/respawning, not as a live tank on the map', () => {
        const snap = emptySnapshot();
        snap.players[0].hidden = true;
        const prompt = buildHintPrompt(snap);
        expect(prompt).toContain('destroyed, respawning');
    });

    it('places enemy tanks and players on the ascii grid', () => {
        const snap = emptySnapshot();
        snap.tanks.push({
            keyIndex: 1, position: [0, 0], direction: 'SOUTH', fireTick: 0, moveTickAccumulator: 0,
        });
        const prompt = buildHintPrompt(snap);
        const mapLines = prompt.split('\n').filter((l) => /^[.,#@!~X$E12]+$/.test(l));
        expect(mapLines.some((l) => l[0] === 'E')).toBe(true);

        const [px, py] = snap.players[0].position;
        const row = mapLines[py / SPRITE_SIZE];
        expect(row[px / SPRITE_SIZE]).toBe('1');
    });
});
