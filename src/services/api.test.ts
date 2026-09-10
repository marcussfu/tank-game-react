import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    api,
    ApiError,
    health,
    API_URL,
    submitScore,
    fetchLeaderboard,
    loadSave,
    saveProgress,
    clearSave,
} from './api';

const mockFetch = (impl: (url: URL, init?: RequestInit) => Response) => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL, init?: RequestInit) => impl(url, init)));
};

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
    it('health() GETs /health and returns the parsed body', async () => {
        mockFetch((url) => {
            expect(url.toString()).toBe(`${API_URL}/health`);
            return new Response(JSON.stringify({ ok: true, ts: 123 }), { status: 200 });
        });
        expect(await health()).toEqual({ ok: true, ts: 123 });
    });

    it('appends defined query params and skips undefined ones', async () => {
        mockFetch((url) => {
            expect(url.searchParams.get('limit')).toBe('5');
            expect(url.searchParams.has('mode')).toBe(false);
            return new Response('[]', { status: 200 });
        });
        await api.request('/leaderboard', { query: { limit: 5, mode: undefined } });
    });

    it('JSON-encodes a body and sets the content-type', async () => {
        mockFetch((_url, init) => {
            expect(init?.method).toBe('POST');
            expect(init?.body).toBe('{"name":"ACE"}');
            expect((init?.headers as Record<string, string>)['content-type']).toBe('application/json');
            return new Response('{}', { status: 200 });
        });
        await api.request('/scores', { method: 'POST', body: { name: 'ACE' } });
    });

    it('throws ApiError with the status on a non-2xx response', async () => {
        mockFetch(() => new Response('nope', { status: 503 }));
        await expect(health()).rejects.toMatchObject({ name: 'ApiError', status: 503 });
        await expect(health()).rejects.toBeInstanceOf(ApiError);
    });

    it('returns undefined for a 204 (no body to parse)', async () => {
        mockFetch(() => new Response(null, { status: 204 }));
        await expect(api.request('/save/x', { method: 'DELETE' })).resolves.toBeUndefined();
    });

    it('submitScore POSTs the payload to /scores', async () => {
        mockFetch((url, init) => {
            expect(url.pathname).toBe('/scores');
            expect(init?.method).toBe('POST');
            expect(JSON.parse(String(init?.body))).toEqual({ name: 'ACE', score: 900, level: 2, mode: 'solo' });
            return new Response(JSON.stringify({ id: 'r1', name: 'ACE', score: 900, level: 2, mode: 'solo', createdAt: 1 }), { status: 201 });
        });
        const row = await submitScore({ name: 'ACE', score: 900, level: 2, mode: 'solo' });
        expect(row.id).toBe('r1');
    });

    it('fetchLeaderboard passes limit/mode as query params', async () => {
        mockFetch((url) => {
            expect(url.pathname).toBe('/leaderboard');
            expect(url.searchParams.get('limit')).toBe('10');
            expect(url.searchParams.get('mode')).toBe('coop');
            return new Response('[]', { status: 200 });
        });
        expect(await fetchLeaderboard({ limit: 10, mode: 'coop' })).toEqual([]);
    });

    it('loadSave returns the row, or null on 404 / network error', async () => {
        mockFetch(() => new Response(JSON.stringify({ levelIndex: 1, lives: 2, score: 400, updatedAt: 1 }), { status: 200 }));
        expect(await loadSave('k')).toMatchObject({ levelIndex: 1 });

        mockFetch(() => new Response('', { status: 404 }));
        expect(await loadSave('k')).toBeNull();

        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
        expect(await loadSave('k')).toBeNull();
    });

    it('saveProgress PUTs to /save/:key', async () => {
        mockFetch((url, init) => {
            expect(url.pathname).toBe('/save/player-9');
            expect(init?.method).toBe('PUT');
            return new Response(JSON.stringify({ levelIndex: 2, lives: 3, score: 800, updatedAt: 2 }), { status: 200 });
        });
        expect(await saveProgress('player-9', { levelIndex: 2, lives: 3, score: 800 })).toMatchObject({ levelIndex: 2 });
    });

    it('clearSave swallows failures', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
        await expect(clearSave('k')).resolves.toBeUndefined();
    });
});
