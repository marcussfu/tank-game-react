import { SPRITE_SIZE } from '../engine/constants';
import { getTileSprite } from '../engine/map/tileTypes';
import { getSprite } from './sprites';
import type { SpriteName } from './sprites';
import type { TileGrid } from '../engine/types';

// getTileSprite's names track the DOM version's CSS class names 1:1 (see
// map-tile.styles.scss) — most map straight to a sprite, 'grass' has no
// image (just the black fill below), and 'star-wall' deliberately looks
// identical to a plain wall (wall.png) until a bullet reveals it as a star.
const IMAGE_BY_BASE_NAME: Partial<Record<string, SpriteName>> = {
    shelter: 'shelter',
    star: 'star',
    wall: 'wall',
    'star-wall': 'wall',
    rock: 'rock',
    water: 'water',
    'rock-cube': 'rock-cube',
    boom: 'boom',
    eagle: 'eagle',
    flag: 'flag',
};

// Matches map-tile.styles.scss's quadrant classes: the eagle/flag sprite
// sheets are 40x40 (2x2 grid of 20x20 sub-sprites); the DOM version showed
// one quadrant per tile via `background-position`, here via a source crop.
const QUADRANT_OFFSET: Record<string, [number, number]> = {
    'left-top': [0, 0],
    'right-top': [SPRITE_SIZE, 0],
    'left-bottom': [0, SPRITE_SIZE],
    'right-bottom': [SPRITE_SIZE, SPRITE_SIZE],
};

/** Draws the static tile layer. Call only when the engine emits `mapChanged`
 * — not every frame — this is the whole point of splitting it from the
 * entity layer (see the plan's section 3). */
export const drawMap = (ctx: CanvasRenderingContext2D, tiles: TileGrid): void => {
    const width = tiles[0].length * SPRITE_SIZE;
    const height = tiles.length * SPRITE_SIZE;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row < tiles.length; row++) {
        for (let col = 0; col < tiles[row].length; col++) {
            const [baseName, modifier] = getTileSprite(tiles[row][col]).split(' ');
            const imageKey = IMAGE_BY_BASE_NAME[baseName];
            if (!imageKey) continue;
            const image = getSprite(imageKey);
            if (!image) continue;

            const dx = col * SPRITE_SIZE;
            const dy = row * SPRITE_SIZE;
            if (modifier) {
                const [sx, sy] = QUADRANT_OFFSET[modifier];
                ctx.drawImage(image, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
            } else {
                ctx.drawImage(image, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
            }
        }
    }
};
