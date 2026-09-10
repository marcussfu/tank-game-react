import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Leaderboard from './leaderboard.component';
import * as apiModule from '../../services/api';
import type { ScoreRow } from '../../net/apiTypes';

const rows: ScoreRow[] = [
    { id: 'a', name: 'ACE', score: 5000, level: 3, mode: 'solo', createdAt: 3 },
    { id: 'b', name: 'BEE', score: 3000, level: 2, mode: 'solo', createdAt: 2 },
];

describe('Leaderboard', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows LOADING then the ranked rows', async () => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockResolvedValue(rows);
        render(<Leaderboard onClose={() => {}} />);
        expect(screen.getByText('LOADING…')).toBeInTheDocument();

        await waitFor(() => expect(screen.getByText('ACE')).toBeInTheDocument());
        expect(screen.getByText('5,000')).toBeInTheDocument();
        expect(screen.getByText('BEE')).toBeInTheDocument();
    });

    it('highlights the just-submitted row', async () => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockResolvedValue(rows);
        render(<Leaderboard onClose={() => {}} highlightId="b" />);
        await waitFor(() => expect(screen.getByText('BEE')).toBeInTheDocument());
        expect(screen.getByText('BEE').closest('tr')).toHaveClass('is-me');
    });

    it('shows an empty-state message when there are no scores', async () => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockResolvedValue([]);
        render(<Leaderboard onClose={() => {}} />);
        await waitFor(() => expect(screen.getByText('NO SCORES YET')).toBeInTheDocument());
    });

    it('shows an error message when the fetch fails', async () => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockRejectedValue(new Error('down'));
        render(<Leaderboard onClose={() => {}} />);
        await waitFor(() => expect(screen.getByText('SCORES UNAVAILABLE')).toBeInTheDocument());
    });

    it('BACK calls onClose', async () => {
        vi.spyOn(apiModule, 'fetchLeaderboard').mockResolvedValue([]);
        const onClose = vi.fn();
        render(<Leaderboard onClose={onClose} />);
        fireEvent.click(screen.getByText('BACK'));
        expect(onClose).toHaveBeenCalled();
    });
});
