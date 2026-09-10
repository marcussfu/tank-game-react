import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameStart from './game-start.component';
import { audioManager } from '../../audio/AudioManager';
import { TIPS } from '../../engine/maps/tips';

describe('GameStart', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('clicking 2 PLAYERS runs the transition sequence, then requests an offline 2-player start', () => {
        vi.useFakeTimers();
        const onStart = vi.fn();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart onStart={onStart} />);

        fireEvent.click(screen.getByText('2 PLAYERS'));
        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.getByText(/STAGE/)).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(5000); });
        expect(onStart).toHaveBeenCalledWith({ online: false, playerCount: 2 });
    });

    it('clicking ONLINE CO-OP requests an online 2-player start', () => {
        vi.useFakeTimers();
        const onStart = vi.fn();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart onStart={onStart} />);

        fireEvent.click(screen.getByText('ONLINE CO-OP'));
        act(() => { vi.advanceTimersByTime(5300); });
        expect(onStart).toHaveBeenCalledWith({ online: true, playerCount: 2 });
    });

    it('shows the level-1 opening tip on the stage transition', () => {
        vi.useFakeTimers();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart onStart={vi.fn()} />);

        fireEvent.click(screen.getByText('1 PLAYER'));
        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.getByText(TIPS[0])).toBeInTheDocument();
    });

    it('opens and closes the RULES dialog', async () => {
        const user = userEvent.setup();
        render(<GameStart onStart={vi.fn()} />);

        await user.click(screen.getByText('RULES'));
        const title = screen.getByText('Operation Manual');

        await user.click(screen.getByLabelText('close'));
        await waitForElementToBeRemoved(title);
    });

    it('clicking 1 PLAYER runs the transition sequence, plays the start bgm, then requests a solo start', () => {
        vi.useFakeTimers();
        const onStart = vi.fn();
        const playBgSpy = vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        render(<GameStart onStart={onStart} />);

        fireEvent.click(screen.getByText('1 PLAYER'));

        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.getByText(/STAGE/)).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(500); });
        expect(playBgSpy).toHaveBeenCalledWith('start');
        expect(onStart).not.toHaveBeenCalled();

        act(() => { vi.advanceTimersByTime(4500); });
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onStart).toHaveBeenCalledWith({ online: false, playerCount: 1 });
    });

    it('Enter starts the game, but is suppressed while the RULES dialog is open', () => {
        vi.useFakeTimers();
        const onStart = vi.fn();
        vi.spyOn(audioManager, 'playBg').mockImplementation(() => {});
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        render(<GameStart onStart={onStart} />);

        fireEvent.click(screen.getByText('RULES'));
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => { vi.advanceTimersByTime(5300); });
        expect(onStart).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('close'));
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => { vi.advanceTimersByTime(5300); });
        expect(onStart).toHaveBeenCalledTimes(1);
    });
});
