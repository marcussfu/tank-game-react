import { GameServer } from './GameServer';

/**
 * Entry point: a WebSocket server that hosts one `GameLoop` per room, forwards
 * each client's input to its own player slot, and broadcasts the authoritative
 * snapshot every tick. This is the server-authoritative half of network
 * multiplayer; M-MP-4 wires the browser client to read these snapshots.
 */
const port = Number(process.env.PORT ?? 8787);
const server = new GameServer({ port });

server.listen().then((boundPort) => {
    console.log(`[server] listening on ws://localhost:${boundPort}`);
    console.log('[server] join the "default" room to play; a 2nd joiner auto-starts co-op');
});

const shutdown = () => {
    server.close().then(() => {
        console.log('\n[server] stopped');
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
