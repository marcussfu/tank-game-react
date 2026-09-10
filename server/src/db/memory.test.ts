import { describe, expect, it } from 'vitest';
import { MemoryDb } from './memory';

describe('MemoryDb', () => {
    it('stamps an id and createdAt on addScore', async () => {
        const db = new MemoryDb();
        const row = await db.addScore({ name: 'ACE', score: 1200, level: 2, mode: 'solo' });
        expect(row.id).toMatch(/[0-9a-f-]{36}/);
        expect(row.createdAt).toBeGreaterThan(0);
        expect(row).toMatchObject({ name: 'ACE', score: 1200, level: 2, mode: 'solo' });
    });

    it('listScores returns highest score first, then oldest', async () => {
        const db = new MemoryDb();
        await db.addScore({ name: 'A', score: 100, level: 1, mode: 'solo' });
        await db.addScore({ name: 'B', score: 300, level: 1, mode: 'solo' });
        await db.addScore({ name: 'C', score: 300, level: 1, mode: 'solo' });
        const list = await db.listScores();
        expect(list.map((r) => r.name)).toEqual(['B', 'C', 'A']); // 300 (B before C), then 100
    });

    it('listScores honours limit and mode filter', async () => {
        const db = new MemoryDb();
        await db.addScore({ name: 'S1', score: 10, level: 1, mode: 'solo' });
        await db.addScore({ name: 'S2', score: 20, level: 1, mode: 'solo' });
        await db.addScore({ name: 'O1', score: 99, level: 1, mode: 'online' });

        expect((await db.listScores({ limit: 1 })).map((r) => r.name)).toEqual(['O1']);
        expect((await db.listScores({ mode: 'solo' })).map((r) => r.name)).toEqual(['S2', 'S1']);
    });

    it('putSave upserts and getSave / deleteSave round-trip', async () => {
        const db = new MemoryDb();
        expect(await db.getSave('k')).toBeNull();

        const first = await db.putSave('k', { levelIndex: 1, lives: 2, score: 500 });
        expect(first).toMatchObject({ levelIndex: 1, lives: 2, score: 500 });
        expect(first.updatedAt).toBeGreaterThan(0);

        await db.putSave('k', { levelIndex: 2, lives: 3, score: 900 });
        expect(await db.getSave('k')).toMatchObject({ levelIndex: 2, lives: 3, score: 900 });

        await db.deleteSave('k');
        expect(await db.getSave('k')).toBeNull();
    });
});
