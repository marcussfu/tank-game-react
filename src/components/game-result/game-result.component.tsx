
import { useEffect, Fragment } from 'react';
import {useAppSelector} from '../../store/hooks';
import { useActions } from '../../store/hooks/useActions';
import useAudio from '../../store/hooks/useAudio';

import game_over_bgm from '../../assets/sounds/game_over_bgm.mp3';
import game_win_bgm from '../../assets/sounds/game_win_bgm.mp3';
import click from '../../assets/sounds/click.mp3';
import './game-result.styles.scss';

const GameResult = () => {
    const {game_over} = useAppSelector(state => state.worldReducer);
    const {bgVolume, effectVolume} = useAppSelector(state => state.settingReducer);
    const {gameInit} = useActions();

    const gameResultAudio = useAudio(game_over? game_over_bgm:game_win_bgm, {volume: bgVolume});
    const clickAudio = useAudio(click, {volume: effectVolume});

    const gameRestart = () => {
        clickAudio.play();
        gameInit();
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
        <div className='game-result-container' style={{color: game_over? 'red':'green'}}>
            {game_over?
                <Fragment>
                    <div className='result-text'>GAME</div>
                    <div className='result-text'>OVER</div>
                </Fragment>:
                <Fragment>
                    <div className='result-text'>YOU</div>
                    <div className='result-text'>WIN</div>
                </Fragment>
            }
        </div>
    )
};

export default GameResult;
