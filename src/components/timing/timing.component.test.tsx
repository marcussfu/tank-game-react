import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Timing from './timing.component';
import { renderWithStore } from '../../test/renderWithStore';

describe('Timing', () => {
    it('formats seconds as M:SS', () => {
        renderWithStore(<Timing />, { hud: { timeRemainingSec: 65, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 3, livesP2: null, score: 0 } });
        expect(screen.getByText('1 : 05')).toBeInTheDocument();
    });

    it('pads single-digit seconds with a leading zero', () => {
        renderWithStore(<Timing />, { hud: { timeRemainingSec: 60, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 3, livesP2: null, score: 0 } });
        expect(screen.getByText('1 : 00')).toBeInTheDocument();
    });

    it('renders orange when 20s or more remain', () => {
        renderWithStore(<Timing />, { hud: { timeRemainingSec: 20, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 3, livesP2: null, score: 0 } });
        expect(screen.getByText('0 : 20')).toHaveStyle({ color: 'rgb(255, 165, 0)' });
    });

    it('renders red under the 20s short-of-time threshold', () => {
        renderWithStore(<Timing />, { hud: { timeRemainingSec: 19, enemiesRemaining: 0, levelIndex: 0, totalLevels: 1, lives: 3, livesP2: null, score: 0 } });
        expect(screen.getByText('0 : 19')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });
});
