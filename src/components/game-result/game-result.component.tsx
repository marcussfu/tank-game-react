
import { useEffect, Fragment } from 'react';
import {useAppSelector} from '../../store/hooks';
import { audioManager } from '../../audio/AudioManager';

import './game-result.styles.scss';
import type { Engine } from '../../engine/Engine';

interface GameResultProps {
    engine: Engine;
}

const GameResult = ({engine}: GameResultProps) => {
    const status = useAppSelector(state => state.world.status);
    const { levelIndex, totalLevels } = useAppSelector(state => state.hud);
    const won = status === 'won';
    // A win on any level but the last one moves on to the next map instead
    // of ending the run — matches the genre convention of linear stage
    // progression (no level-select screen needed).
    const hasNextLevel = won && levelIndex < totalLevels - 1;

    useEffect(() => {
        const proceed = () => {
            audioManager.playEffect('click');
            if (hasNextLevel) engine.advanceLevel();
            else engine.returnToMenu();
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            proceed();
        };
        const handleMouseDown = () => {
            proceed();
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        }
    }, [engine, hasNextLevel]);

    return (
        <div className='game-result-container' style={{color: won? 'green':'red'}}>
            {won && hasNextLevel &&
                <Fragment>
                    <div className='result-text'>STAGE</div>
                    <div className='result-text'>CLEAR</div>
                </Fragment>
            }
            {won && !hasNextLevel &&
                <Fragment>
                    <div className='result-text'>YOU</div>
                    <div className='result-text'>WIN</div>
                </Fragment>
            }
            {!won &&
                <Fragment>
                    <div className='result-text'>GAME</div>
                    <div className='result-text'>OVER</div>
                </Fragment>
            }
        </div>
    )
};

export default GameResult;
