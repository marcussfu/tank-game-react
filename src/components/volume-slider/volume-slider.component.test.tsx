import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VolumeSlider from './volume-slider.component';

describe('VolumeSlider', () => {
    it('renders the label and the initial value derived from volumeValue (0-1 -> 0-100)', () => {
        render(<VolumeSlider volumeProperty={{ audioTitle: 'BG', volumeValue: 0.5, setAudioVolumeFunc: vi.fn() }} />);

        expect(screen.getByText('BG')).toBeInTheDocument();
        expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
    });

    it('calls setAudioVolumeFunc with the value normalized back to 0-1', () => {
        const setAudioVolumeFunc = vi.fn();
        render(<VolumeSlider volumeProperty={{ audioTitle: 'Shoot', volumeValue: 0.5, setAudioVolumeFunc }} />);

        // MUI's Slider role="slider" element is a real native <input
        // type="range"> under the hood — jsdom doesn't implement native
        // arrow-key stepping for it, so the realistic way to drive a value
        // change is the same `fireEvent.change` used for any other input.
        fireEvent.change(screen.getByRole('slider'), { target: { value: '51' } });

        expect(setAudioVolumeFunc).toHaveBeenLastCalledWith(0.51);
    });
});
