import { useEffect, useRef } from 'react';
import { Engine } from '../engine/Engine';
import { loadSprites } from './sprites';
import { drawMap } from './drawMap';
import { drawEntities } from './drawEntities';
import { useResizeCanvas } from './useResizeCanvas';
import { MAP_WIDTH, MAP_HEIGHT, SIM_TICK_MS } from '../engine/constants';
import type { Direction } from '../engine/types';

// Caps how many sim ticks a single RAF frame will "catch up" on, so
// backgrounding the tab and returning doesn't trigger a death-spiral of
// hundreds of queued ticks trying to run synchronously (see plan section 3).
const MAX_CATCHUP_TICKS = 10;

const KEY_TO_DIRECTION: Record<string, Direction> = {
    ArrowUp: 'NORTH',
    KeyW: 'NORTH',
    ArrowDown: 'SOUTH',
    KeyS: 'SOUTH',
    ArrowLeft: 'WEST',
    KeyA: 'WEST',
    ArrowRight: 'EAST',
    KeyD: 'EAST',
};

/**
 * RAF-driven, fixed-timestep (SIM_TICK_MS) canvas renderer wrapping an
 * `Engine` instance. Not wired into the app yet (M1 scope) — this owns its
 * own keyboard input for now so it's self-contained enough to smoke-test in
 * isolation; M2 will decide how real UI input reaches the engine.
 */
const CanvasStage = () => {
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const entityCanvasRef = useRef<HTMLCanvasElement>(null);

    useResizeCanvas(mapCanvasRef);
    useResizeCanvas(entityCanvasRef);

    useEffect(() => {
        const engine = new Engine();
        engine.start();

        let disposed = false;
        let rafId = 0;
        let lastTime = performance.now();
        let accumulator = 0;
        const heldDirections = new Set<Direction>();

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

        const currentHeldDirection = (): Direction | '' => {
            for (const dir of heldDirections) return dir;
            return '';
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const dir = KEY_TO_DIRECTION[e.code];
            if (dir) {
                heldDirections.add(dir);
                engine.setPlayerInputDirection(currentHeldDirection());
            } else if (e.code === 'Space' || e.code === 'Enter') {
                engine.firePlayerBullet();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const dir = KEY_TO_DIRECTION[e.code];
            if (dir) {
                heldDirections.delete(dir);
                engine.setPlayerInputDirection(currentHeldDirection());
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const loop = (time: number) => {
            const delta = Math.min(time - lastTime, MAX_CATCHUP_TICKS * SIM_TICK_MS);
            lastTime = time;
            accumulator += delta;
            while (accumulator >= SIM_TICK_MS) {
                engine.tick();
                accumulator -= SIM_TICK_MS;
            }

            const ctx = entityCanvasRef.current?.getContext('2d');
            if (ctx) drawEntities(ctx, engine.getSnapshot(), MAP_WIDTH, MAP_HEIGHT);

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
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: `${MAP_WIDTH}/${MAP_HEIGHT}` }}>
            <canvas
                ref={mapCanvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
            <canvas
                ref={entityCanvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
        </div>
    );
};

export default CanvasStage;
