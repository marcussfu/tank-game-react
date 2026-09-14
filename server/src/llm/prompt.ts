import { SPRITE_SIZE } from '../../../src/engine/constants';
import type { EngineSnapshot } from '../../../src/engine/types';

const cell = (pos: readonly [number, number]): [number, number] => [pos[1] / SPRITE_SIZE, pos[0] / SPRITE_SIZE];

/** A compact ASCII render of the paused board: the static tile layer plus
 * live entity positions overlaid, so the model reasons about the actual
 * fight instead of a generic map. */
const renderAscii = (snapshot: EngineSnapshot): string => {
    const grid: string[][] = snapshot.tiles.map((row) =>
        row.map((t): string => {
            if (t === 0) return '.';
            if (t === 4) return '$'; // revealed star
            if (t === 1) return ','; // shelter/bush
            if (Math.round(t) === 10) return '@'; // eagle, intact
            if (Math.round(t) === 11) return '!'; // eagle, destroyed
            if (t === 7) return '~'; // water
            if (t === 6 || t === 8) return 'X'; // rock / rock-cube
            return '#'; // wall, star-wall, boom — anything else impassable
        }),
    );

    for (const tank of snapshot.tanks) {
        const [r, c] = cell(tank.position);
        if (grid[r]?.[c] !== undefined) grid[r][c] = 'E';
    }
    for (const player of snapshot.players) {
        if (player.hidden) continue;
        const [r, c] = cell(player.position);
        if (grid[r]?.[c] !== undefined) grid[r][c] = String(player.id + 1);
    }

    return grid.map((row) => row.join('')).join('\n');
};

/** Builds the user message sent to the hint model from a live (paused)
 * `EngineSnapshot`. */
export const buildHintPrompt = (snapshot: EngineSnapshot): string => {
    const players = snapshot.players
        .map((p) => `P${p.id + 1}: ${p.hidden ? 'destroyed, respawning' : 'active'}, ${p.lives} lives left${p.invincible ? ', invincible' : ''}`)
        .join('\n');

    return [
        'MAP (row-major, top-left origin). Legend: .=open ,=bush #=wall/obstacle X=rock(indestructible) ~=water',
        '@=your eagle base (intact) !=eagle destroyed $=revealed star E=enemy tank 1/2=player tank(s):',
        '',
        renderAscii(snapshot),
        '',
        `Time left: ${snapshot.timeRemainingSec}s   Score: ${snapshot.score}   Enemy tanks alive: ${snapshot.tanks.length}`,
        players,
        '',
        'Give the player one urgent, concrete instruction for what to do the moment they unpause.',
    ].join('\n');
};
