
import { useActions } from '../../store/hooks/useActions';
import useAudio from '../../store/hooks/useAudio';
import { useAppSelector } from '../../store/hooks';
import { useEffect, useState } from 'react';

import Button from '../../components/button/button.component';
import titleImg from '../../assets/scene/title.png';

import game_start_bgm from '../../assets/sounds/game_start_bgm.mp3';
import click from '../../assets/sounds/click.mp3';

import './game-start.styles.scss';

const GameStart = () => {
    const {gameStart} = useActions();
    const {bgVolume, effectVolume} = useAppSelector(state => state.settingReducer);
    const [isShowTransitionStage, setIsShowTransitionStage] = useState(false);
    const [selectPlayerCount, setSelectPlayerCount] = useState(1);

    const gameStartAudio = useAudio(game_start_bgm, {volume: bgVolume});
    const clickAudio = useAudio(click, {volume: effectVolume});

    const gameStartAction = () => {
        setTimeout(() => {
            setIsShowTransitionStage(true);
            gameStartActionSetTimeOut();
        }, 300);
    };

    const gameStartActionSetTimeOut = () => {
        setTimeout(() => {
            gameStartAudio.play();
            gameStartActionSetTimeOut_1();
        }, 500);
    };

    const gameStartActionSetTimeOut_1 = () => {
        setTimeout(() => {
            gameStart();
        }, 4500);
    };

    const selectGameStartAction = () => {
        if (document.getElementById('1p')!.style.visibility === 'visible')
            gameStartAction();
        else if (document.getElementById('2p')!.style.visibility === 'visible')
            goto2p();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        switch (e.keyCode) {
            case 13:
                clickAudio.replay();
                return selectGameStartAction();
            case 38: case 87:
                return setSelectPlayerCount(1);
            case 40: case 83:
                return setSelectPlayerCount(2);
        }
    }

    const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.id === 'game-start-btn-1')
            setSelectPlayerCount(1);
        else if (target.id === 'game-start-btn-2')
            setSelectPlayerCount(2);
    };

    const goto2p = () => {
        console.log("2p");
    };

    useEffect(() => {
        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mouseover', handleMouseOver);
        }
    }, []);

    useEffect(() => {
        if (selectPlayerCount === 1) {
            document.getElementById('1p')!.style.visibility='visible';
            document.getElementById('game-start-btn-1')!.style.color = 'white';
            document.getElementById('2p')!.style.visibility='hidden';
            document.getElementById('game-start-btn-2')!.style.color = 'gray';
        }
        else if (selectPlayerCount === 2) {
            document.getElementById('1p')!.style.visibility='hidden';
            document.getElementById('game-start-btn-1')!.style.color = 'gray';
            document.getElementById('2p')!.style.visibility='visible';
            document.getElementById('game-start-btn-2')!.style.color = 'white';
        }
    }, [selectPlayerCount]);

    return (
        <div className='game-start-container'>
            {!isShowTransitionStage && <>
                <img className='title' src={titleImg} alt='title' />
                <div id='game-start-button-container-id' className='game-start-button-container'>
                    <div className='game-start-button-content-container'>
                        <div id='1p' className='select-item-tank1' />
                        <Button id='game-start-btn-1' clickFunction={gameStartAction}>1 PLAYER</Button>
                    </div>
                    <div className='game-start-button-content-container'>
                        <div id='2p' className='select-item-tank2' />
                        <Button id='game-start-btn-2' clickFunction={goto2p}>2 PLAYERS</Button>
                    </div>
                </div>
            </>}
            {isShowTransitionStage && <div className='stage-container'>
                <div className='stage-bg-up'></div>
                <div className='stage-bg-down'></div>
                <div className='stage-text'>STAGE&nbsp;&nbsp;&nbsp;&nbsp;1</div>
            </div>}
        </div>
    )
};

export default GameStart;
