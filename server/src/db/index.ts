/**
 * The one storage seam the HTTP layer talks to. X2 ships the interface plus a
 * file-backed `JsonDb` and an in-memory `MemoryDb`; the leaderboard / cloud-save
 * routes that call `addScore` etc. land in X3. Kept narrow and SQL-shaped so an
 * X6 `D1Db` / Postgres impl drops in without touching routes.
 */

export interface ScoreRow {
    id: string;
    name: string;
    score: number;
    /** 1-based level the run reached. */
    level: number;
    /** 'solo' | 'coop' | 'online' — free-form, validated at the route. */
    mode: string;
    createdAt: number;
}

export interface SaveRow {
    levelIndex: number;
    lives: number;
    score: number;
    updatedAt: number;
}

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
