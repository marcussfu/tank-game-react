import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemoryDb } from '../db/index';
import type { HintClient } from '../llm/hintClient';
import { emptySnapshot } from '../../../src/engine/emptySnapshot';

const app = () => createApp({ db: new MemoryDb() });

const stubHintClient = (hint = 'HOLD THE LINE.'): HintClient & { calls: string[] } => {
    const calls: string[] = [];
    return {
        calls,
        generate: async (prompt: string) => {
            calls.push(prompt);
            return hint;
        },
    };
};

describe('http app', () => {
    it('GET /health returns ok with a timestamp', async () => {
        const res = await app().request('/health');
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; ts: number };
        expect(body.ok).toBe(true);
        expect(typeof body.ts).toBe('number');
    });

    it('sends permissive CORS headers', async () => {
        const res = await app().request('/health', { headers: { origin: 'http://localhost:5173' } });
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('404s an unknown route', async () => {
        expect((await app().request('/nope')).status).toBe(404);
    });

    describe('POST /scores', () => {
        it('stores a valid score and echoes the row', async () => {
            const a = app();
            const res = await a.request('/scores', {
                method: 'POST',
                body: JSON.stringify({ name: 'ACE', score: 1234.7, level: 2, mode: 'coop' }),
            });
            expect(res.status).toBe(201);
            const row = (await res.json()) as Record<string, unknown>;
            expect(row).toMatchObject({ name: 'ACE', score: 1235, level: 2, mode: 'coop' });
            expect(typeof row.id).toBe('string');
        });

        it('rejects a missing name / negative score / bad level with 400', async () => {
            const a = app();
            for (const bad of [
                { score: 10, level: 1 },
                { name: 'X', score: -1, level: 1 },
                { name: 'X', score: 10, level: 0 },
            ]) {
                const res = await a.request('/scores', { method: 'POST', body: JSON.stringify(bad) });
                expect(res.status).toBe(400);
            }
        });

        it('falls back to mode "solo" for an unknown mode', async () => {
            const res = await app().request('/scores', {
                method: 'POST',
                body: JSON.stringify({ name: 'X', score: 1, level: 1, mode: 'chaos' }),
            });
            expect(((await res.json()) as { mode: string }).mode).toBe('solo');
        });
    });

    describe('GET /leaderboard', () => {
        it('returns rows highest-first, honouring limit and mode', async () => {
            const a = app();
            for (const s of [
                { name: 'A', score: 100, level: 1, mode: 'solo' },
                { name: 'B', score: 300, level: 1, mode: 'solo' },
                { name: 'C', score: 999, level: 1, mode: 'coop' },
            ]) {
                await a.request('/scores', { method: 'POST', body: JSON.stringify(s) });
            }

            const top = (await (await a.request('/leaderboard?limit=1')).json()) as { name: string }[];
            expect(top.map((r) => r.name)).toEqual(['C']);

            const solo = (await (await a.request('/leaderboard?mode=solo')).json()) as { name: string }[];
            expect(solo.map((r) => r.name)).toEqual(['B', 'A']);
        });
    });

    describe('/save/:key', () => {
        it('404s when there is no save, then round-trips PUT / GET / DELETE', async () => {
            const a = app();
            expect((await a.request('/save/p1')).status).toBe(404);

            const put = await a.request('/save/p1', {
                method: 'PUT',
                body: JSON.stringify({ levelIndex: 1, lives: 2, score: 500 }),
            });
            expect(put.status).toBe(200);

            const got = (await (await a.request('/save/p1')).json()) as Record<string, unknown>;
            expect(got).toMatchObject({ levelIndex: 1, lives: 2, score: 500 });

            expect((await a.request('/save/p1', { method: 'DELETE' })).status).toBe(204);
            expect((await a.request('/save/p1')).status).toBe(404);
        });

        it('rejects a save payload with a negative or non-finite field', async () => {
            const res = await app().request('/save/p1', {
                method: 'PUT',
                body: JSON.stringify({ levelIndex: -1, lives: 2, score: 0 }),
            });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /hint', () => {
        it('sends the snapshot through the hint client and returns its text', async () => {
            const hintClient = stubHintClient('WATCH THE WEST WALL.');
            const a = createApp({ db: new MemoryDb(), hintClient });
            const res = await a.request('/hint', {
                method: 'POST',
                body: JSON.stringify({ snapshot: emptySnapshot() }),
            });
            expect(res.status).toBe(200);
            expect((await res.json()) as { hint: string }).toEqual({ hint: 'WATCH THE WEST WALL.' });
            expect(hintClient.calls).toHaveLength(1);
            expect(hintClient.calls[0]).toContain('MAP');
        });

        it('503s when no hint client is configured', async () => {
            const res = await app().request('/hint', {
                method: 'POST',
                body: JSON.stringify({ snapshot: emptySnapshot() }),
            });
            expect(res.status).toBe(503);
        });

        it('400s a missing or malformed snapshot', async () => {
            const a = createApp({ db: new MemoryDb(), hintClient: stubHintClient() });
            expect((await a.request('/hint', { method: 'POST', body: '{}' })).status).toBe(400);
            expect((await a.request('/hint', { method: 'POST', body: 'not json' })).status).toBe(400);
        });

        it('502s when the hint client throws', async () => {
            const hintClient: HintClient = { generate: async () => { throw new Error('down'); } };
            const a = createApp({ db: new MemoryDb(), hintClient });
            const res = await a.request('/hint', {
                method: 'POST',
                body: JSON.stringify({ snapshot: emptySnapshot() }),
            });
            expect(res.status).toBe(502);
        });

        it('rate-limits after too many requests from the same (shared, in tests) bucket', async () => {
            const hintClient = stubHintClient();
            const a = createApp({ db: new MemoryDb(), hintClient });
            const req = () => a.request('/hint', { method: 'POST', body: JSON.stringify({ snapshot: emptySnapshot() }) });

            const statuses: number[] = [];
            for (let i = 0; i < 12; i++) statuses.push((await req()).status);
            expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
        });
    });
});
