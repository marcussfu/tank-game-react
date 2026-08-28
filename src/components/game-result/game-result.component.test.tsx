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

    // On the last level, hud.levelIndex === totalLevels - 1, so a win has no
    // next level to advance to — the "final victory" case.
    const lastLevelHud = { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 1, totalLevels: 2, lives: 3, livesP2: null };
    const firstLevelHud = { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null };

    it('shows YOU WIN in green when won on the last level', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, {
            world: { status: 'won', shortOfTime: false },
            hud: lastLevelHud,
        });
        expect(screen.getByText('WIN')).toBeInTheDocument();
        expect(screen.getByText('YOU').parentElement).toHaveStyle({ color: 'rgb(0, 128, 0)' });
    });

    it('shows STAGE CLEAR when won with more levels remaining', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, {
            world: { status: 'won', shortOfTime: false },
            hud: firstLevelHud,
        });
        expect(screen.getByText('CLEAR')).toBeInTheDocument();
        expect(screen.getByText('STAGE').parentElement).toHaveStyle({ color: 'rgb(0, 128, 0)' });
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

    it('a mousedown anywhere also restarts, when there is no next level', () => {
        const engine = makeFakeEngine();
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'won', shortOfTime: false },
            hud: lastLevelHud,
        });

        fireEvent.mouseDown(window);

        expect(engine.returnToMenu).toHaveBeenCalledTimes(1);
        expect(engine.advanceLevel).not.toHaveBeenCalled();
    });

    it('a mousedown advances to the next level instead of returning to the menu, when one remains', () => {
        const engine = makeFakeEngine();
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'won', shortOfTime: false },
            hud: firstLevelHud,
        });

        fireEvent.mouseDown(window);

        expect(engine.advanceLevel).toHaveBeenCalledTimes(1);
        expect(engine.returnToMenu).not.toHaveBeenCalled();
    });

    it('non-Enter keys do nothing', () => {
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'won', shortOfTime: false },
            hud: lastLevelHud,
        });

        fireEvent.keyDown(window, { key: 'a' });

        expect(engine.returnToMenu).not.toHaveBeenCalled();
    });
});
