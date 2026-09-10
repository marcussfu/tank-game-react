import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemoryDb } from '../db/index';

describe('http app', () => {
    it('GET /health returns ok with a timestamp', async () => {
        const app = createApp({ db: new MemoryDb() });
        const res = await app.request('/health');
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; ts: number };
        expect(body.ok).toBe(true);
        expect(typeof body.ts).toBe('number');
    });

    it('sends permissive CORS headers', async () => {
        const app = createApp({ db: new MemoryDb() });
        const res = await app.request('/health', { headers: { origin: 'http://localhost:5173' } });
        expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('404s an unknown route', async () => {
        const app = createApp({ db: new MemoryDb() });
        expect((await app.request('/nope')).status).toBe(404);
    });
});
