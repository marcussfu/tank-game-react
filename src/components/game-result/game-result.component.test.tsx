import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { makeFakeEngine } from '../../test/fakeEngine';
import GameResult from './game-result.component';
import { audioManager } from '../../audio/AudioManager';
import * as apiModule from '../../services/api';
import { TIPS } from '../../engine/maps/tips';

const lastLevelHud = { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 1, totalLevels: 2, lives: 3, livesP2: null, score: 4200 };
const firstLevelHud = { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 2, lives: 3, livesP2: null, score: 900 };

describe('GameResult', () => {
    beforeEach(() => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockResolvedValue([]);
        vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());

    it('shows YOU WIN + the score on a final win', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, {
            world: { status: 'won', shortOfTime: false },
            hud: lastLevelHud,
        });
        expect(screen.getByText('WIN')).toBeInTheDocument();
        expect(screen.getByText('YOU').parentElement).toHaveStyle({ color: 'rgb(0, 128, 0)' });
        expect(screen.getByText('SCORE 4,200')).toBeInTheDocument();
    });

    it('shows GAME OVER + the score on a loss', () => {
        renderWithStore(<GameResult engine={makeFakeEngine()} />, {
            world: { status: 'lost', shortOfTime: false },
            hud: lastLevelHud,
        });
        expect(screen.getByText('OVER')).toBeInTheDocument();
        expect(screen.getByText('GAME').parentElement).toHaveStyle({ color: 'rgb(255, 0, 0)' });
        expect(screen.getByText('SCORE 4,200')).toBeInTheDocument();
    });

    it('STAGE CLEAR shows the next level tip, advances on mousedown, and has no score form', () => {
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'won', shortOfTime: false },
            hud: firstLevelHud, // levelIndex 0 → next-level tip is TIPS[1]
        });
        expect(screen.getByText('CLEAR')).toBeInTheDocument();
        expect(screen.getByText(TIPS[1])).toBeInTheDocument();
        expect(screen.queryByLabelText('name')).not.toBeInTheDocument();

        fireEvent.mouseDown(window);
        expect(engine.advanceLevel).toHaveBeenCalledTimes(1);
        expect(engine.returnToMenu).not.toHaveBeenCalled();
    });

    it('a local run-over shows a submit form (no click-anywhere shortcut)', () => {
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'lost', shortOfTime: false },
            hud: lastLevelHud,
        });

        expect(screen.getByLabelText('name')).toBeInTheDocument();
        fireEvent.mouseDown(window); // must NOT proceed while the form is up
        expect(engine.returnToMenu).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('MENU'));
        expect(engine.returnToMenu).toHaveBeenCalledTimes(1);
    });

    it('an online run-over keeps the plain click-to-continue behaviour', () => {
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} online />, {
            world: { status: 'lost', shortOfTime: false },
            hud: lastLevelHud,
        });
        expect(screen.queryByLabelText('name')).not.toBeInTheDocument();
        fireEvent.mouseDown(window);
        expect(engine.returnToMenu).toHaveBeenCalledTimes(1);
    });

    it('SUBMIT posts the score then shows the leaderboard', async () => {
        const submitSpy = vi.spyOn(apiModule, 'submitScore').mockResolvedValue({
            id: 'row-1', name: 'ACE', score: 4200, level: 2, mode: 'solo', createdAt: 1,
        });
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'lost', shortOfTime: false },
            hud: lastLevelHud,
        });

        fireEvent.change(screen.getByLabelText('name'), { target: { value: 'ace' } });
        fireEvent.click(screen.getByText('SUBMIT'));

        await waitFor(() => expect(screen.getByText('HIGH SCORES')).toBeInTheDocument());
        expect(submitSpy).toHaveBeenCalledWith({ name: 'ACE', score: 4200, level: 2, mode: 'solo' });
    });

    it('does not submit an empty name', () => {
        const submitSpy = vi.spyOn(apiModule, 'submitScore');
        const engine = makeFakeEngine();
        renderWithStore(<GameResult engine={engine} />, {
            world: { status: 'lost', shortOfTime: false },
            hud: lastLevelHud,
        });
        fireEvent.change(screen.getByLabelText('name'), { target: { value: '   ' } });
        fireEvent.click(screen.getByText('SUBMIT'));
        expect(submitSpy).not.toHaveBeenCalled();
    });
});
