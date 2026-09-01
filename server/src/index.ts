import { GameLoop } from './GameLoop';

/**
 * Placeholder entry point: spins up one headless game and logs the engine
 * event stream plus a periodic state summary, proving the Engine runs
 * unmodified outside the browser. M-MP-3 replaces this with a WebSocket
 * server that drives one `GameLoop` per room and broadcasts snapshots.
 */
const loop = new GameLoop();

loop.onEvent((event) => {
    if (event.type === 'timeTick') return; // too chatty
    console.log('[event]', JSON.stringify(event));
});

loop.start(2);
console.log('[server] headless 2-player game started at', new Date().toISOString());

const summary = setInterval(() => {
    const s = loop.getSnapshot();
    console.log(
        `[state] status=${s.status} t=${s.timeRemainingSec}s level=${s.levelIndex + 1}/${s.totalLevels} ` +
        `tanks=${s.tanks.length} bullets=${s.bullets.length} ` +
        `lives=[${s.players.map((p) => `P${p.id + 1}:${p.lives}${p.active ? '' : ' (out)'}`).join(', ')}]`,
    );
}, 1000);

const shutdown = () => {
    clearInterval(summary);
    loop.stop();
    console.log('\n[server] stopped');
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
