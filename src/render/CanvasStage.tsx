import { useEffect, useRef } from 'react';
import type { GameController } from '../engine/GameController';
import type { NetworkGameClient } from '../net/NetworkGameClient';
import { interpolateSnapshot } from '../net/interpolate';
import { loadSprites } from './sprites';
import { drawMap } from './drawMap';
import { drawEntities } from './drawEntities';
import { useResizeCanvas } from './useResizeCanvas';
import { MAP_WIDTH, MAP_HEIGHT, SIM_TICK_MS } from '../engine/constants';
import type { Direction } from '../engine/types';
import { useAppSelector } from '../store/hooks';

// Caps how many sim ticks a single RAF frame will "catch up" on, so
// backgrounding the tab and returning doesn't trigger a death-spiral of
// hundreds of queued ticks trying to run synchronously (see plan section 3).
const MAX_CATCHUP_TICKS = 10;

const ARROW_KEYS: Record<string, Direction> = {
    ArrowUp: 'NORTH',
    ArrowDown: 'SOUTH',
    ArrowLeft: 'WEST',
    ArrowRight: 'EAST',
};
const WASD_KEYS: Record<string, Direction> = {
    KeyW: 'NORTH',
    KeyS: 'SOUTH',
    KeyA: 'WEST',
    KeyD: 'EAST',
};
const P2_FIRE_KEYS = new Set(['ShiftLeft', 'KeyF']);
const FIRE_KEYS = new Set(['Space', 'Enter']);

interface CanvasStageProps {
    engine: GameController;
    /** Present only in online mode: drives interpolation and tells the input
     * handler which player slot this browser owns. */
    netClient?: NetworkGameClient;
}

/**
 * RAF-driven, fixed-timestep (SIM_TICK_MS) canvas renderer. Only mounted while
 * `world.status` is 'playing'/'paused'. In local mode it ticks the `Engine`
 * and draws its snapshot; in online mode (`netClient` set) it never ticks —
 * it draws the server's latest snapshot interpolated toward the previous one —
 * and every movement key drives this browser's own player slot.
 */
const CanvasStage = ({ engine, netClient }: CanvasStageProps) => {
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const entityCanvasRef = useRef<HTMLCanvasElement>(null);
    const status = useAppSelector(state => state.world.status);

    useResizeCanvas(mapCanvasRef);
    useResizeCanvas(entityCanvasRef);

    useEffect(() => {
        let disposed = false;
        let rafId = 0;
        let lastTime = performance.now();
        let accumulator = 0;

        const online = !!netClient;
        // Online: every arrow/WASD key drives this browser's own slot.
        // Local co-op: arrows are player 1, WASD player 2. Local solo: both are player 1.
        const twoPlayerLocal = !online && engine.getSnapshot().players.length > 1;
        const p1Keys: Record<string, Direction> = twoPlayerLocal ? ARROW_KEYS : { ...ARROW_KEYS, ...WASD_KEYS };
        const p2Keys: Record<string, Direction> = twoPlayerLocal ? WASD_KEYS : {};
        const heldDirections: [Set<Direction>, Set<Direction>] = [new Set(), new Set()];

        // In online mode both key sets funnel into heldDirections[0] and the
        // slot is the server-assigned local id, read fresh each event.
        const localSlot = () => (netClient ? netClient.localPlayerId : 0);

        const redrawMap = () => {
            const ctx = mapCanvasRef.current?.getContext('2d');
            if (ctx) drawMap(ctx, engine.getSnapshot().tiles);
        };

        const unsubscribe = engine.on(event => {
            if (event.type === 'mapChanged') redrawMap();
        });

        loadSprites().then(() => {
            if (!disposed) redrawMap();
        });

        const currentHeldDirection = (bucket: number): Direction | '' => {
            for (const dir of heldDirections[bucket]) return dir;
            return '';
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (p1Keys[e.code]) {
                heldDirections[0].add(p1Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(0), online ? localSlot() : 0);
            } else if (p2Keys[e.code]) {
                heldDirections[1].add(p2Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(1), 1);
            } else if (FIRE_KEYS.has(e.code)) {
                engine.firePlayerBullet(online ? localSlot() : 0);
            } else if (twoPlayerLocal && P2_FIRE_KEYS.has(e.code)) {
                engine.firePlayerBullet(1);
            } else if (e.code === 'Escape') {
                engine.togglePause();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (p1Keys[e.code]) {
                heldDirections[0].delete(p1Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(0), online ? localSlot() : 0);
            } else if (p2Keys[e.code]) {
                heldDirections[1].delete(p2Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(1), 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const loop = (time: number) => {
            if (netClient) {
                // Server is authoritative — never tick locally; interpolate
                // between the two most recent snapshots for smoothness.
                const alpha = netClient.elapsedSinceSnapshot(time) / SIM_TICK_MS;
                const drawState = interpolateSnapshot(netClient.getPreviousSnapshot(), engine.getSnapshot(), alpha);
                const ctx = entityCanvasRef.current?.getContext('2d');
                if (ctx) drawEntities(ctx, drawState, MAP_WIDTH, MAP_HEIGHT);
            } else {
                const delta = Math.min(time - lastTime, MAX_CATCHUP_TICKS * SIM_TICK_MS);
                lastTime = time;
                accumulator += delta;
                while (accumulator >= SIM_TICK_MS) {
                    engine.tick();
                    accumulator -= SIM_TICK_MS;
                }
                const ctx = entityCanvasRef.current?.getContext('2d');
                if (ctx) drawEntities(ctx, engine.getSnapshot(), MAP_WIDTH, MAP_HEIGHT);
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () => {
            disposed = true;
            cancelAnimationFrame(rafId);
            unsubscribe();
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [engine, netClient]);

    // Deliberately no own aspect-ratio here: the DOM version's Map/Player/Tank
    // components just filled whatever box their parent (`.playground-container`,
    // which declares its own `aspect-ratio: 2/1`) gave them, and this stays
    // consistent with that rather than fighting it with a second, conflicting
    // aspect-ratio (800x480's true ratio is 5/3, not 2/1).
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={mapCanvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
            <canvas
                ref={entityCanvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
            {status === 'paused' && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}>
                    PAUSED
                </div>
            )}
        </div>
    );
};

export default CanvasStage;
