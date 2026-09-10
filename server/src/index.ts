import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GameServer } from './GameServer';
import { makeDb } from './db/index';
import { startHttpServer, DEFAULT_HTTP_PORT } from './http/server';

/**
 * Entry point. Two surfaces on one Node process:
 *  - the WebSocket game server (M-MP-3): one `GameLoop` per room, snapshot
 *    broadcast, server-authoritative multiplayer.
 *  - the REST API (X2+): leaderboard / cloud-save / LLM-hint proxy, backed by
 *    a JSON file on disk (or an in-memory store when `DB_FILE` is unset).
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const wsPort = Number(process.env.PORT ?? 8787);
const httpPort = Number(process.env.HTTP_PORT ?? DEFAULT_HTTP_PORT);
const dbFile = process.env.DB_FILE ?? path.join(here, '..', 'data', 'app.json');

const gameServer = new GameServer({ port: wsPort });
const db = makeDb({ file: dbFile });

const start = async () => {
    const wsBound = await gameServer.listen();
    console.log(`[server] websocket on ws://localhost:${wsBound}`);
    console.log('[server] join the "default" room to play; a 2nd joiner auto-starts co-op');

    const http = await startHttpServer({ db }, httpPort);
    console.log(`[server] rest api on http://localhost:${http.port}  (db: ${dbFile})`);

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
