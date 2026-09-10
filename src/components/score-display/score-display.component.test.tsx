import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import ScoreDisplay from './score-display.component';
import { renderWithStore } from '../../test/renderWithStore';

const hud = (score: number) => ({
    timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1,
    lives: 3, livesP2: null, score,
});

describe('ScoreDisplay', () => {
    it('renders the score', () => {
        renderWithStore(<ScoreDisplay />, { hud: hud(0) });
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('formats large numbers with separators', () => {
        renderWithStore(<ScoreDisplay />, { hud: hud(12500) });
        expect(screen.getByText('12,500')).toBeInTheDocument();
    });
});
