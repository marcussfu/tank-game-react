import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import World from './world.component';

// Same rationale as CanvasStage.test.tsx — World owns a real Engine
// internally (not injectable), so this exercises the actual menu -> playing
// screen transition end-to-end, with just enough stubbing (fake timers for
// GameStart's transition sequence, RAF/ResizeObserver for CanvasStage) to
// make that deterministic in jsdom without a live render loop.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

describe('World (screen flow integration)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('ResizeObserver', ResizeObserverStub);
        vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('goes from the menu through the start transition into a playable, pausable canvas', () => {
        renderWithStore(<World />);

        expect(screen.getByText('1 PLAYER')).toBeInTheDocument();

        fireEvent.click(screen.getByText('1 PLAYER'));
        act(() => { vi.advanceTimersByTime(5300); }); // 300 + 500 + 4500ms GameStart sequence

        expect(screen.queryByText('1 PLAYER')).not.toBeInTheDocument();
        expect(document.querySelectorAll('canvas')).toHaveLength(2);

        fireEvent.keyDown(window, { code: 'Escape' });
        expect(screen.getByText('PAUSED')).toBeInTheDocument();
        expect(screen.getByLabelText('resume')).toBeInTheDocument();

        fireEvent.keyDown(window, { code: 'Escape' });
        expect(screen.queryByText('PAUSED')).not.toBeInTheDocument();
        expect(screen.getByLabelText('pause')).toBeInTheDocument();
    });
});
