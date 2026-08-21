import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameIntroDialog from './game-intro-dialog.component';

describe('GameIntroDialog', () => {
    it('renders nothing when closed', () => {
        render(<GameIntroDialog open={false} onClose={() => {}} />);
        expect(screen.queryByText('Operation Manual')).not.toBeInTheDocument();
    });

    it('shows the rules content when open', () => {
        render(<GameIntroDialog open onClose={() => {}} />);
        expect(screen.getByText('Operation Manual')).toBeInTheDocument();
        expect(screen.getByText(/eliminate all enemy tanks/i)).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<GameIntroDialog open onClose={onClose} />);

        await user.click(screen.getByLabelText('close'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
