
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
    const won = status === 'won';

    useEffect(() => {
        const gameRestart = () => {
            audioManager.playEffect('click');
            engine.returnToMenu();
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            gameRestart();
        };
        const handleMouseDown = () => {
            gameRestart();
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        }
    }, [engine]);

    return (
        <div className='game-result-container' style={{color: won? 'green':'red'}}>
            {won?
                <Fragment>
                    <div className='result-text'>YOU</div>
                    <div className='result-text'>WIN</div>
                </Fragment>:
                <Fragment>
                    <div className='result-text'>GAME</div>
                    <div className='result-text'>OVER</div>
                </Fragment>
            }
        </div>
    )
};

export default GameResult;
