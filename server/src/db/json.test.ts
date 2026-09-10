import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JsonDb } from './json';

describe('JsonDb', () => {
    let dir: string;
    let file: string;

    beforeEach(() => {
        dir = mkdtempSync(path.join(tmpdir(), 'tankdb-'));
        file = path.join(dir, 'app.json');
    });
    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it('starts empty when the file does not exist', async () => {
        const db = new JsonDb(file);
        expect(await db.listScores()).toEqual([]);
        await db.close();
    });

    it('persists writes atomically and a fresh instance reads them back', async () => {
        const a = new JsonDb(file);
        await a.addScore({ name: 'ACE', score: 700, level: 2, mode: 'solo' });
        await a.putSave('player-1', { levelIndex: 1, lives: 2, score: 700 });
        await a.close(); // flushes

        const onDisk = JSON.parse(readFileSync(file, 'utf8'));
        expect(onDisk.scores).toHaveLength(1);

        const b = new JsonDb(file);
        expect((await b.listScores())[0]).toMatchObject({ name: 'ACE', score: 700 });
        expect(await b.getSave('player-1')).toMatchObject({ levelIndex: 1, lives: 2 });
        await b.close();
    });

    it('debounces then flushes on its own', async () => {
        const db = new JsonDb(file);
        await db.addScore({ name: 'X', score: 1, level: 1, mode: 'solo' });
        // WRITE_DEBOUNCE_MS is 50 — give it room.
        await new Promise((r) => setTimeout(r, 120));
        expect(JSON.parse(readFileSync(file, 'utf8')).scores).toHaveLength(1);
        await db.close();
    });

    it('recovers from an unreadable file by starting empty', async () => {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(file, '{ not json');
        const db = new JsonDb(file);
        expect(await db.listScores()).toEqual([]);
        await db.close();
    });
});
