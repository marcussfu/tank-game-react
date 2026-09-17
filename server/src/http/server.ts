import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { createApp } from './app';
import type { HttpDeps } from './app';

export const DEFAULT_PORT = 8788;

export interface HttpServer {
    port: number;
    /** The underlying Node server. `GameServer` attaches its WebSocket
     * upgrade handling to this instead of opening a second port. */
    raw: ServerType;
    /** Stops listening. */
    close(): Promise<void>;
}

/** Binds the REST app to a port. `port` 0 picks a free one (tests). */
export const startHttpServer = (deps: HttpDeps, port = DEFAULT_PORT): Promise<HttpServer> => {
    const app = createApp(deps);
    return new Promise((resolve) => {
        const server = serve({ fetch: app.fetch, port }, (info) => {
            resolve({
                port: info.port,
                raw: server,
                close: () => new Promise<void>((r) => server.close(() => r())),
            });
        });
    });
};
