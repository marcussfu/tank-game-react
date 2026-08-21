
import { useEffect, Fragment } from 'react';
import {useAppSelector} from '../../store/hooks';
import useAudio from '../../store/hooks/useAudio';

import game_over_bgm from '../../assets/sounds/game_over_bgm.mp3';
import game_win_bgm from '../../assets/sounds/game_win_bgm.mp3';
import click from '../../assets/sounds/click.mp3';
import './game-result.styles.scss';
import type { Engine } from '../../engine/Engine';

interface GameResultProps {
    engine: Engine;
}

const GameResult = ({engine}: GameResultProps) => {
    const status = useAppSelector(state => state.world.status);
    const won = status === 'won';
    const {bgVolume, effectVolume} = useAppSelector(state => state.settings);

    const gameResultAudio = useAudio(won? game_win_bgm:game_over_bgm, {volume: bgVolume});
    const clickAudio = useAudio(click, {volume: effectVolume});

    const gameRestart = () => {
        clickAudio.play();
        engine.returnToMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        switch (e.keyCode) {
            case 13:
                return gameRestart();
        }
    }

    const handleMouseDown = () => {
        gameRestart();
    };

    useEffect(() => {
        gameResultAudio.play();

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleMouseDown);
        }
    }, []);

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
