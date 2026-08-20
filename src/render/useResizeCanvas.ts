import { useEffect } from 'react';
import type { RefObject } from 'react';
import { MAP_WIDTH, MAP_HEIGHT } from '../engine/constants';

/**
 * Sets the canvas's drawing-buffer size to the fixed logical resolution
 * (800x480) scaled by devicePixelRatio, and applies a matching transform —
 * once on mount and again whenever ResizeObserver reports the element's
 * rendered size changed (orientation change, viewport resize, zoom). The
 * CSS size itself is left to `width:100%` + `aspect-ratio` in the caller, so
 * this never has to read layout on a hot path (unlike the DOM version's
 * per-tick `offsetWidth`/`offsetHeight` reads).
 */
export const useResizeCanvas = (canvasRef: RefObject<HTMLCanvasElement | null>): void => {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const applySize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = MAP_WIDTH * dpr;
            canvas.height = MAP_HEIGHT * dpr;
            canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        applySize();

        const observer = new ResizeObserver(applySize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [canvasRef]);
};
