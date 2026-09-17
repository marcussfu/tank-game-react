import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GameServer } from './GameServer';
import { makeDb } from './db/index';
import { makeHintClient } from './llm/hintClient';
import { startHttpServer, DEFAULT_PORT } from './http/server';

/**
 * Entry point. One Node process, one port: the REST API (X2+) and the
 * WebSocket game server (M-MP-3) share the same HTTP server — `ws` upgrades
 * requests on it at `/ws` instead of opening a second port, so single-port
 * deploy targets (Render, most PaaS free tiers) need no extra config.
 * `PORT` follows the platform-injected convention most hosts use.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const dbFile = process.env.DB_FILE ?? path.join(here, '..', 'data', 'app.json');

const db = makeDb({ file: dbFile });

const start = async () => {
    const http = await startHttpServer({ db, hintClient: makeHintClient() }, port);
    console.log(`[server] rest api on http://localhost:${http.port}  (db: ${dbFile})`);

    // `startHttpServer` never enables HTTP/2, so `http.raw` is always a plain
    // `node:http` server at runtime even though `@hono/node-server` types it
    // as the broader `ServerType` union.
    const gameServer = new GameServer({ server: http.raw as import('node:http').Server, path: '/ws' });
    await gameServer.listen();
    console.log(`[server] websocket on ws://localhost:${http.port}/ws`);
    console.log('[server] join the "default" room to play; a 2nd joiner auto-starts co-op');
    if (process.env.LLM_FAKE === '1') console.log('[server] LLM_FAKE=1 — /hint returns a canned response');

    const shutdown = () => {
        Promise.all([gameServer.close(), http.close(), db.close()]).then(() => {
            console.log('\n[server] stopped');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

start();
