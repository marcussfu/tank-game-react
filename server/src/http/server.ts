import { serve } from '@hono/node-server';
import { createApp } from './app';
import type { HttpDeps } from './app';

export const DEFAULT_HTTP_PORT = 8788;

export interface HttpServer {
    port: number;
    /** Stops listening. */
    close(): Promise<void>;
}

/** Binds the REST app to a port. `port` 0 picks a free one (tests). */
export const startHttpServer = (deps: HttpDeps, port = DEFAULT_HTTP_PORT): Promise<HttpServer> => {
    const app = createApp(deps);
    return new Promise((resolve) => {
        const server = serve({ fetch: app.fetch, port }, (info) => {
            resolve({
                port: info.port,
                close: () => new Promise<void>((r) => server.close(() => r())),
            });
        });
    });
};
