import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { makeFakeEngine } from '../../test/fakeEngine';
import StateBar from './state-bar.component';

describe('StateBar', () => {
    it('has no pause button in menu status', () => {
        renderWithStore(<StateBar engine={makeFakeEngine()} />, { world: { status: 'menu', shortOfTime: false } });
        expect(screen.queryByLabelText('pause')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('resume')).not.toBeInTheDocument();
    });

    it('shows a pause button while playing', () => {
        renderWithStore(<StateBar engine={makeFakeEngine()} />, { world: { status: 'playing', shortOfTime: false } });
        expect(screen.getByLabelText('pause')).toBeInTheDocument();
    });

    it('does not show the lives count in menu status', () => {
        renderWithStore(<StateBar engine={makeFakeEngine()} />, { world: { status: 'menu', shortOfTime: false } });
        expect(screen.queryByText('×3')).not.toBeInTheDocument();
    });

    it('shows the lives count while playing', () => {
        renderWithStore(<StateBar engine={makeFakeEngine()} />, { world: { status: 'playing', shortOfTime: false } });
        expect(screen.getByText('×3')).toBeInTheDocument();
    });

    it('shows a resume button while paused', () => {
        renderWithStore(<StateBar engine={makeFakeEngine()} />, { world: { status: 'paused', shortOfTime: false } });
        expect(screen.getByLabelText('resume')).toBeInTheDocument();
    });

    it('clicking the pause/resume button calls engine.togglePause', () => {
        const engine = makeFakeEngine();
        renderWithStore(<StateBar engine={engine} />, { world: { status: 'playing', shortOfTime: false } });

        fireEvent.click(screen.getByLabelText('pause'));

        expect(engine.togglePause).toHaveBeenCalledTimes(1);
    });
});
