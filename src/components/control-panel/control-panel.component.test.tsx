import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithStore } from '../../test/renderWithStore';
import { makeFakeEngine } from '../../test/fakeEngine';
import ControlPanel from './control-panel.component';

describe('ControlPanel', () => {
    it('renders nothing outside of playing status', () => {
        const { container } = renderWithStore(
            <ControlPanel type="fire" engine={makeFakeEngine()} />,
            { world: { status: 'menu', shortOfTime: false } },
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while paused (touch controls hidden alongside the pause overlay)', () => {
        const { container } = renderWithStore(
            <ControlPanel type="fire" engine={makeFakeEngine()} />,
            { world: { status: 'paused', shortOfTime: false } },
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('the fire button calls engine.firePlayerBullet while playing', () => {
        const engine = makeFakeEngine();
        renderWithStore(
            <ControlPanel type="fire" engine={engine} />,
            { world: { status: 'playing', shortOfTime: false } },
        );

        fireEvent.click(screen.getByText('FIRE'));

        expect(engine.firePlayerBullet).toHaveBeenCalledTimes(1);
    });
});
