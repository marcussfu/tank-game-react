import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, health, API_URL } from './api';

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
});
