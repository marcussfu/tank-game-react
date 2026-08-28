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

        // In a solo game WASD is a second alias for player 1 (unchanged
        // behaviour); in local co-op it drives player 2 instead, and the
        // arrow keys are player 1 only.
        const twoPlayer = engine.getSnapshot().players.length > 1;
        const p1Keys: Record<string, Direction> = twoPlayer ? ARROW_KEYS : { ...ARROW_KEYS, ...WASD_KEYS };
        const p2Keys: Record<string, Direction> = twoPlayer ? WASD_KEYS : {};
        const heldDirections: [Set<Direction>, Set<Direction>] = [new Set(), new Set()];

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

        const currentHeldDirection = (playerId: number): Direction | '' => {
            for (const dir of heldDirections[playerId]) return dir;
            return '';
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (p1Keys[e.code]) {
                heldDirections[0].add(p1Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(0), 0);
            } else if (p2Keys[e.code]) {
                heldDirections[1].add(p2Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(1), 1);
            } else if (e.code === 'Space' || e.code === 'Enter') {
                engine.firePlayerBullet(0);
            } else if (twoPlayer && P2_FIRE_KEYS.has(e.code)) {
                engine.firePlayerBullet(1);
            } else if (e.code === 'Escape') {
                engine.togglePause();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (p1Keys[e.code]) {
                heldDirections[0].delete(p1Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(0), 0);
            } else if (p2Keys[e.code]) {
                heldDirections[1].delete(p2Keys[e.code]);
                engine.setPlayerInputDirection(currentHeldDirection(1), 1);
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
