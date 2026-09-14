import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { makeFakeEngine } from '../../test/fakeEngine';
import PauseMenu from './pause-menu.component';
import * as apiModule from '../../services/api';

describe('PauseMenu', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows PAUSED and a HINT button initially', () => {
        renderWithStore(<PauseMenu engine={makeFakeEngine()} />);
        expect(screen.getByText('PAUSED')).toBeInTheDocument();
        expect(screen.getByText('HINT')).toBeInTheDocument();
    });

    it('clicking HINT shows a loading state then the returned text', async () => {
        vi.spyOn(apiModule, 'requestHint').mockResolvedValue({ hint: 'WATCH THE WEST WALL.' });
        const engine = makeFakeEngine();
        renderWithStore(<PauseMenu engine={engine} />);

        fireEvent.click(screen.getByText('HINT'));
        expect(screen.getByText('THINKING…')).toBeInTheDocument();

        await waitFor(() => expect(screen.getByText('WATCH THE WEST WALL.')).toBeInTheDocument());
        expect(apiModule.requestHint).toHaveBeenCalledWith(engine.getSnapshot());
    });

    it('shows an error message when the request fails', async () => {
        vi.spyOn(apiModule, 'requestHint').mockRejectedValue(new Error('down'));
        renderWithStore(<PauseMenu engine={makeFakeEngine()} />);

        fireEvent.click(screen.getByText('HINT'));
        await waitFor(() => expect(screen.getByText(/NO HINT AVAILABLE/)).toBeInTheDocument());
    });

    it('RESUME calls engine.togglePause', () => {
        const engine = makeFakeEngine();
        renderWithStore(<PauseMenu engine={engine} />);
        fireEvent.click(screen.getByText('RESUME'));
        expect(engine.togglePause).toHaveBeenCalledTimes(1);
    });
});
