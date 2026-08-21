import { useEffect, useRef } from 'react';
import type { Engine } from '../engine/Engine';
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

interface CanvasStageProps {
    engine: Engine;
}

/**
 * RAF-driven, fixed-timestep (SIM_TICK_MS) canvas renderer wrapping an
 * `Engine` instance. Only mounted while `world.status === 'playing'` (World
 * owns the Engine instance and its lifecycle — this component just ticks and
 * draws whatever it's given). Owns its own keyboard input, alongside
 * ControlPanel's touch input — the same dual-input-source design the DOM
 * version used (Player's keyboard listeners + ControlPanel's joystick/button).
 */
const CanvasStage = ({ engine }: CanvasStageProps) => {
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
            } else if (e.code === 'Escape') {
                engine.togglePause();
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
    }, [engine]);

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
                    fontFamily: 'Pixeloid', fontSize: '2rem', color: 'white',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}>
                    PAUSED
                </div>
            )}
        </div>
    );
};

export default CanvasStage;
