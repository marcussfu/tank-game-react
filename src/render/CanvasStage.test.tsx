import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithStore } from '../test/renderWithStore';
import { makeFakeEngine } from '../test/fakeEngine';
import CanvasStage from './CanvasStage';

// jsdom implements neither ResizeObserver nor a real canvas 2d context, and
// letting the real RAF loop run would tick the (fake) engine on real browser
// timing. This is deliberately a lightweight smoke test per the plan — no
// pixel-level assertions, just "mounts/unmounts cleanly and keyboard input
// reaches the engine".
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

describe('CanvasStage', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', ResizeObserverStub);
        vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders two canvases and unmounts without throwing', () => {
        const { container, unmount } = renderWithStore(
            <CanvasStage engine={makeFakeEngine()} />,
            { world: { status: 'playing', shortOfTime: false } },
        );
        expect(container.querySelectorAll('canvas')).toHaveLength(2);
        expect(() => unmount()).not.toThrow();
    });

    it('shows no PAUSED overlay while playing', () => {
        const { queryByText } = renderWithStore(
            <CanvasStage engine={makeFakeEngine()} />,
            { world: { status: 'playing', shortOfTime: false } },
        );
        expect(queryByText('PAUSED')).not.toBeInTheDocument();
    });

    it('shows a PAUSED overlay while paused', () => {
        const { getByText } = renderWithStore(
            <CanvasStage engine={makeFakeEngine()} />,
            { world: { status: 'paused', shortOfTime: false } },
        );
        expect(getByText('PAUSED')).toBeInTheDocument();
    });

    it('maps held movement keys to engine.setPlayerInputDirection, clearing on keyup', () => {
        const engine = makeFakeEngine();
        renderWithStore(<CanvasStage engine={engine} />, { world: { status: 'playing', shortOfTime: false } });

        fireEvent.keyDown(window, { code: 'ArrowUp' });
        expect(engine.setPlayerInputDirection).toHaveBeenLastCalledWith('NORTH');

        fireEvent.keyUp(window, { code: 'ArrowUp' });
        expect(engine.setPlayerInputDirection).toHaveBeenLastCalledWith('');
    });

    it('Space fires and Escape toggles pause', () => {
        const engine = makeFakeEngine();
        renderWithStore(<CanvasStage engine={engine} />, { world: { status: 'playing', shortOfTime: false } });

        fireEvent.keyDown(window, { code: 'Space' });
        expect(engine.firePlayerBullet).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(window, { code: 'Escape' });
        expect(engine.togglePause).toHaveBeenCalledTimes(1);
    });
});
