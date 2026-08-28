import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import LivesDisplay from './lives-display.component';
import { renderWithStore } from '../../test/renderWithStore';

describe('LivesDisplay', () => {
    it('renders the current lives count prefixed with ×', () => {
        renderWithStore(<LivesDisplay />, {
            hud: { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 2 },
        });
        expect(screen.getByText('×2')).toBeInTheDocument();
    });

    it('renders ×0 once lives are exhausted', () => {
        renderWithStore(<LivesDisplay />, {
            hud: { timeRemainingSec: 100, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 0 },
        });
        expect(screen.getByText('×0')).toBeInTheDocument();
    });
});
