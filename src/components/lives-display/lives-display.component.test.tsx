import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import LivesDisplay from './lives-display.component';
import { renderWithStore } from '../../test/renderWithStore';

describe('LivesDisplay', () => {
    it('renders the current lives count prefixed with × in a solo game', () => {
        renderWithStore(<LivesDisplay />, {
            hud: { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 2, livesP2: null, score: 0 },
        });
        expect(screen.getByText('×2')).toBeInTheDocument();
    });

    it('renders ×0 once lives are exhausted', () => {
        renderWithStore(<LivesDisplay />, {
            hud: { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 0, livesP2: null, score: 0 },
        });
        expect(screen.getByText('×0')).toBeInTheDocument();
    });

    it('renders a labelled P1/P2 pair in local co-op', () => {
        renderWithStore(<LivesDisplay />, {
            hud: { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 3, livesP2: 1, score: 0 },
        });
        expect(screen.getByText('P1 ×3')).toBeInTheDocument();
        expect(screen.getByText('P2 ×1')).toBeInTheDocument();
    });
});
