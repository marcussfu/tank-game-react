import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './button.component';
import { audioManager } from '../../audio/AudioManager';

describe('Button', () => {
    it('calls clickFunction and plays the click effect on click', async () => {
        const user = userEvent.setup();
        const clickFunction = vi.fn();
        const playEffectSpy = vi.spyOn(audioManager, 'playEffect').mockImplementation(() => {});

        render(<Button clickFunction={clickFunction}>1 PLAYER</Button>);
        await user.click(screen.getByText('1 PLAYER'));

        expect(clickFunction).toHaveBeenCalledTimes(1);
        expect(playEffectSpy).toHaveBeenCalledWith('click');
    });

    it('forwards extra props like id onto the container', () => {
        render(<Button id="game-start-btn-1" clickFunction={() => {}}>1 PLAYER</Button>);
        expect(document.getElementById('game-start-btn-1')).not.toBeNull();
    });
});
