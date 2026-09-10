/**
 * One opening tip per level, shown on the STAGE transition. Hand-authored to
 * the same arcade register as the battlefield banter, but a full short
 * sentence; `scripts/gen-tips.ts` regenerates them offline from the map data
 * via Claude. Indexed by level index — must stay `LEVELS.length` long
 * (enforced by tips.test.ts).
 */
export const TIPS: readonly string[] = [
    'TIGHT MAZE. HOLD THE LANES BY YOUR BASE AND PATCH BREACHES FAST.',
    'OPEN GROUND. ONE CORRIDOR FEEDS THE EAGLE — GUARD IT.',
];

/** The tip for `levelIndex`, or '' if none (a map added without a tip). */
export const tipFor = (levelIndex: number): string => TIPS[levelIndex] ?? '';
