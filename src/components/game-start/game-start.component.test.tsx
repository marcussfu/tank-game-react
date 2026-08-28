import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameStart from './game-start.component';
import { makeFakeEngine } from '../../test/fakeEngine';
import { audioManager } from '../../audio/AudioManager';

describe('GameStart', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('clicking 2 PLAYERS runs the transition sequence, then starts a 2-player game', () => {
        vi.useFakeTimers();
        const engine = makeFakeEngine();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart engine={engine} />);

        fireEvent.click(screen.getByText('2 PLAYERS'));
        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.getByText(/STAGE/)).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(5000); });
        expect(engine.start).toHaveBeenCalledWith(2);
    });

    it('opens and closes the RULES dialog', async () => {
        const user = userEvent.setup();
        render(<GameStart engine={makeFakeEngine()} />);

        await user.click(screen.getByText('RULES'));
        const title = screen.getByText('Operation Manual');

        await user.click(screen.getByLabelText('close'));
        await waitForElementToBeRemoved(title);
    });

    it('clicking 1 PLAYER runs the transition sequence, plays the start bgm, then calls engine.start()', () => {
        vi.useFakeTimers();
        const engine = makeFakeEngine();
        const playBgSpy = vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart engine={engine} />);

        fireEvent.click(screen.getByText('1 PLAYER'));

        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.getByText(/STAGE/)).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(500); });
        expect(playBgSpy).toHaveBeenCalledWith('start');
        expect(engine.start).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(4500); });
        expect(engine.start).toHaveBeenCalledTimes(1);
        expect(engine.start).toHaveBeenCalledWith(1);
    });

    it('Enter starts the game, but is suppressed while the RULES dialog is open', () => {
        vi.useFakeTimers();
        const engine = makeFakeEngine();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        render(<GameStart engine={engine} />);

        fireEvent.click(screen.getByText('RULES'));
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => { vi.advanceTimersByTime(5300); });
        expect(engine.start).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('close'));
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => { vi.advanceTimersByTime(5300); });
        expect(engine.start).toHaveBeenCalledTimes(1);
    });
});
