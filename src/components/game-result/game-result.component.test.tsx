import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { makeFakeEngine } from '../../test/fakeEngine';
import GameResult from './game-result.component';
import { audioManager } from '../../audio/AudioManager';

describe('GameResult', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows YOU WIN in green when won', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, { world: { status: 'won', shortOfTime: false } });
        expect(screen.getByText('WIN')).toBeInTheDocument();
        expect(screen.getByText('YOU').parentElement).toHaveStyle({ color: 'rgb(0, 128, 0)' });
    });

    it('shows GAME OVER in red when lost', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, { world: { status: 'lost', shortOfTime: false } });
        expect(screen.getByText('OVER')).toBeInTheDocument();
        expect(screen.getByText('GAME').parentElement).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('Enter plays the click effect and returns to the menu', () => {
        const engine = makeFakeEngine();
        const playEffectSpy = vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        renderWithStore(<GameResult engine={engine} />, { world: { status: 'lost', shortOfTime: false } });

        fireEvent.keyDown(window, { key: 'Enter' });

        expect(playEffectSpy).toHaveBeenCalledWith('click');
        expect(engine.returnToMenu).toHaveBeenCalledTimes(1);
    });

    it('a mousedown anywhere also restarts', () => {
        const engine = makeFakeEngine();
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        renderWithStore(<GameResult engine={engine} />, { world: { status: 'won', shortOfTime: false } });

        fireEvent.mouseDown(window);

        expect(engine.returnToMenu).toHaveBeenCalledTimes(1);
    });

    it('non-Enter keys do nothing', () => {
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, { world: { status: 'won', shortOfTime: false } });

        fireEvent.keyDown(window, { key: 'a' });

        expect(engine.returnToMenu).not.toHaveBeenCalled();
    });
});
