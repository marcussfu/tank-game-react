// Single source of truth for tile value -> sprite name, replacing the DOM
// version's two near-duplicate, inconsistent maps (`getTileUrl` +
// `getTileSprite` in config/constants.ts) — bug #11 in the rewrite plan.
export const TILE_SPRITE: Record<number, string> = {
    0: 'grass',
    1: 'shelter',
    4: 'star',
    5: 'wall',
    6: 'rock',
    7: 'water',
    8: 'rock-cube',
    9: 'boom',
    10: 'eagle',
    10.1: 'eagle left-top',
    10.2: 'eagle right-top',
    10.3: 'eagle left-bottom',
    10.4: 'eagle right-bottom',
    11: 'flag',
    11.1: 'flag left-top',
    11.2: 'flag right-top',
    11.3: 'flag left-bottom',
    11.4: 'flag right-bottom',
    12: 'star-wall',
};

export const getTileSprite = (type: number): string => TILE_SPRITE[type] ?? 'grass';

// Tile values that block movement (walls, rock, water, rock-cube, explosion,
// eagle/flag/star-wall variants) — anything >= 5, matching the DOM version's
// `obeserveImpassable`/`isImpassable` threshold.
export const IMPASSABLE_THRESHOLD = 5;
