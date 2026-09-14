import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { hintRequested, hintReceived, hintFailed, hintReset } from '../../store/hintSlice';
import { requestHint } from '../../services/api';
import Button from '../button/button.component';
import type { GameController } from '../../engine/GameController';

import './pause-menu.styles.scss';

interface PauseMenuProps {
    engine: GameController;
}

/**
 * The pause overlay. Beyond the plain "PAUSED" label, offers an on-demand
 * tactical hint: `Engine.pause()` is tick-gated (the game is genuinely
 * frozen, not just visually), so the 1-2s LLM round trip reads as natural
 * rather than as lag. Works in both local and online play — either just
 * sends whatever `engine.getSnapshot()` returns to the backend proxy.
 */
const PauseMenu = ({ engine }: PauseMenuProps) => {
    const dispatch = useAppDispatch();
    const hint = useAppSelector((state) => state.hint);

    // A fresh pause starts with a clean slate — no stale hint from last time.
    useEffect(() => {
        dispatch(hintReset());
    }, [dispatch]);

    const askForHint = async () => {
        dispatch(hintRequested());
        try {
            const { hint: text } = await requestHint(engine.getSnapshot());
            dispatch(hintReceived(text));
        } catch {
            dispatch(hintFailed());
        }
    };

    return (
        <div className='pause-menu'>
            <div className='pause-title'>PAUSED</div>

            {hint.status === 'idle' && (
                <Button id='pause-hint-btn' clickFunction={() => { void askForHint(); }}>HINT</Button>
            )}
            {hint.status === 'loading' && <div className='pause-hint-loading'>THINKING…</div>}
            {hint.status === 'done' && <div className='pause-hint-text'>{hint.text}</div>}
            {hint.status === 'error' && (
                <div className='pause-hint-text pause-hint-error'>NO HINT AVAILABLE — TRY AGAIN LATER.</div>
            )}

            <Button id='pause-resume-btn' clickFunction={() => engine.togglePause()}>RESUME</Button>
        </div>
    );
};

export default PauseMenu;
