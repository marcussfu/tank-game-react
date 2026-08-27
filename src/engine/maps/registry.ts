import { map1 } from './map_1';
import { map2 } from './map_2';
import type { LevelDefinition } from '../types';

/** Ordered list of playable levels — index 0 is what `Engine.start()` always
 * begins on; `Engine.advanceLevel()` steps forward through the rest. */
export const LEVELS: LevelDefinition[] = [map1, map2];
