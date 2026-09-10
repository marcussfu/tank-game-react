import { randomUUID } from 'node:crypto';
import type { Db, ListScoresOptions, SaveRow, ScoreRow } from './index';

export interface DbData {
    scores: ScoreRow[];
    saves: Record<string, SaveRow>;
}

/**
 * In-memory `Db` — the whole implementation lives here; `JsonDb` just adds
 * load-on-start and debounced write-through on top via the `onMutate` hook.
 */
export class MemoryDb implements Db {
    protected data: DbData = { scores: [], saves: {} };

    async addScore(row: Omit<ScoreRow, 'id' | 'createdAt'>): Promise<ScoreRow> {
        const full: ScoreRow = { ...row, id: randomUUID(), createdAt: Date.now() };
        this.data.scores.push(full);
        this.onMutate();
        return full;
    }

    async listScores(options: ListScoresOptions = {}): Promise<ScoreRow[]> {
        const { limit = 20, mode } = options;
        return this.data.scores
            .filter((r) => (mode ? r.mode === mode : true))
            .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
            .slice(0, Math.max(0, limit));
    }

    async getSave(playerKey: string): Promise<SaveRow | null> {
        return this.data.saves[playerKey] ?? null;
    }

    async putSave(playerKey: string, row: Omit<SaveRow, 'updatedAt'>): Promise<SaveRow> {
        const full: SaveRow = { ...row, updatedAt: Date.now() };
        this.data.saves[playerKey] = full;
        this.onMutate();
        return full;
    }

    async deleteSave(playerKey: string): Promise<void> {
        delete this.data.saves[playerKey];
        this.onMutate();
    }

    async close(): Promise<void> {}

    /** Called after every mutation. `MemoryDb` does nothing; `JsonDb` schedules a flush. */
    protected onMutate(): void {}
}
