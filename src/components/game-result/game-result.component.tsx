import { useEffect, useState, Fragment } from 'react';
import { useAppSelector } from '../../store/hooks';
import { audioManager } from '../../audio/AudioManager';
import Button from '../button/button.component';
import Leaderboard from '../leaderboard/leaderboard.component';
import { submitScore } from '../../services/api';
import { getLastName, setLastName } from '../../services/playerKey';
import { tipFor } from '../../engine/maps/tips';

import './game-result.styles.scss';
import type { GameController } from '../../engine/GameController';

interface GameResultProps {
    engine: GameController;
    /** Online games don't submit scores (server owns the run) — the screen
     * stays a plain click-to-continue. */
    online?: boolean;
}

const MAX_NAME = 12;

const GameResult = ({ engine, online = false }: GameResultProps) => {
    const status = useAppSelector((state) => state.world.status);
    const { levelIndex, totalLevels, score } = useAppSelector((state) => state.hud);
    const won = status === 'won';
    // A win on any level but the last one advances instead of ending the run.
    const hasNextLevel = won && levelIndex < totalLevels - 1;
    // Run over (final win or a loss) and a score worth recording.
    const canSubmit = !hasNextLevel && !online;

    const [name, setName] = useState(getLastName);
    const [phase, setPhase] = useState<'result' | 'submitting' | 'leaderboard'>('result');
    const [submittedId, setSubmittedId] = useState<string | undefined>(undefined);

    // The click/Enter-anywhere "continue" shortcut — only while there is no
    // form to interact with (STAGE CLEAR, or an online run's plain end screen).
    useEffect(() => {
        if (canSubmit) return;
        const proceed = () => {
            audioManager.playEffect('click');
            if (hasNextLevel) engine.advanceLevel();
            else engine.returnToMenu();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            proceed();
        };
        window.addEventListener('mousedown', proceed);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', proceed);
            window.removeEventListener('keydown', onKey);
        };
    }, [engine, hasNextLevel, canSubmit]);

    const submit = async () => {
        const trimmed = name.trim().slice(0, MAX_NAME);
        if (!trimmed) return;
        setPhase('submitting');
        setLastName(trimmed);
        const mode = engine.getSnapshot().players.length > 1 ? 'coop' : 'solo';
        try {
            const row = await submitScore({ name: trimmed, score, level: levelIndex + 1, mode });
            setSubmittedId(row.id);
        } catch {
            // network down — still show whatever board we can
        }
        setPhase('leaderboard');
    };

    if (phase === 'leaderboard') {
        return <Leaderboard onClose={() => engine.returnToMenu()} highlightId={submittedId} />;
    }

    return (
        <div className='game-result-container' style={{ color: won ? 'green' : 'red' }}>
            {won && hasNextLevel && (
                <Fragment>
                    <div className='result-text'>STAGE</div>
                    <div className='result-text'>CLEAR</div>
                    <div className='result-tip'>{tipFor(levelIndex + 1)}</div>
                </Fragment>
            )}
            {won && !hasNextLevel && (
                <Fragment>
                    <div className='result-text'>YOU</div>
                    <div className='result-text'>WIN</div>
                </Fragment>
            )}
            {!won && (
                <Fragment>
                    <div className='result-text'>GAME</div>
                    <div className='result-text'>OVER</div>
                </Fragment>
            )}

            {!hasNextLevel && <div className='result-score'>SCORE {score.toLocaleString()}</div>}

            {canSubmit && (
                <div className='result-submit'>
                    <input
                        className='result-name'
                        aria-label='name'
                        maxLength={MAX_NAME}
                        placeholder='YOUR NAME'
                        value={name}
                        onChange={(e) => setName(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                    />
                    <div className='result-actions'>
                        <Button
                            id='result-submit'
                            clickFunction={() => { void submit(); }}
                        >
                            {phase === 'submitting' ? 'SENDING…' : 'SUBMIT'}
                        </Button>
                        <Button id='result-menu' clickFunction={() => engine.returnToMenu()}>MENU</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameResult;
