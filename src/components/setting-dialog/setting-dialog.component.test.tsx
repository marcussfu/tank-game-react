import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '../../test/renderWithStore';
import SettingDialog from './setting-dialog.component';

describe('SettingDialog', () => {
    it('is closed until the settings icon is clicked', () => {
        renderWithStore(<SettingDialog />, { settings: { bgVolume: 0.5, effectVolume: 0.3 } });
        expect(screen.queryByText('Setting')).not.toBeInTheDocument();
    });

    it('opens with both volume sliders on icon click', async () => {
        const user = userEvent.setup();
        renderWithStore(<SettingDialog />, { settings: { bgVolume: 0.5, effectVolume: 0.3 } });

        await user.click(screen.getByLabelText('go to setting'));

        expect(screen.getByText('Setting')).toBeInTheDocument();
        expect(screen.getByText('BG')).toBeInTheDocument();
        expect(screen.getByText('Shoot')).toBeInTheDocument();
    });

    it('dispatches setBgVolume when the BG slider changes', async () => {
        const user = userEvent.setup();
        const { store } = renderWithStore(<SettingDialog />, { settings: { bgVolume: 0.5, effectVolume: 0.3 } });

        await user.click(screen.getByLabelText('go to setting'));
        const [bgSlider] = screen.getAllByRole('slider');
        fireEvent.change(bgSlider, { target: { value: '51' } });

        expect(store.getState().settings.bgVolume).toBeCloseTo(0.51);
        expect(store.getState().settings.effectVolume).toBe(0.3); // untouched
    });

    it('closes via the close button', async () => {
        const user = userEvent.setup();
        renderWithStore(<SettingDialog />, { settings: { bgVolume: 0.5, effectVolume: 0.3 } });
        await user.click(screen.getByLabelText('go to setting'));

        const title = screen.getByText('Setting');
        await user.click(screen.getByLabelText('close'));

        await waitForElementToBeRemoved(title);
    });
});
