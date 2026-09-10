/**
 * The one storage seam the HTTP layer talks to — a narrow, SQL-shaped
 * interface with a file-backed `JsonDb` and an in-memory `MemoryDb`, so an X6
 * `D1Db` / Postgres impl drops in without touching routes. Row shapes are the
 * shared wire types (`src/net/apiTypes.ts`).
 */

import type { SaveRow, ScoreRow } from '../../../src/net/apiTypes';

export type { SaveRow, ScoreRow };

export interface ListScoresOptions {
    limit?: number;
    mode?: string;
}

export interface Db {
    addScore(row: Omit<ScoreRow, 'id' | 'createdAt'>): Promise<ScoreRow>;
    listScores(options?: ListScoresOptions): Promise<ScoreRow[]>;
    getSave(playerKey: string): Promise<SaveRow | null>;
    putSave(playerKey: string, row: Omit<SaveRow, 'updatedAt'>): Promise<SaveRow>;
    deleteSave(playerKey: string): Promise<void>;
    /** Flush anything buffered and release resources. */
    close(): Promise<void>;
}

import { MemoryDb } from './memory';
import { JsonDb } from './json';

export { MemoryDb, JsonDb };

/** A file path picks `JsonDb`; nothing picks `MemoryDb` (tests, ephemeral runs). */
export const makeDb = (options: { file?: string } = {}): Db =>
    options.file ? new JsonDb(options.file) : new MemoryDb();
