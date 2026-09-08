import { useCallback, useEffect, useState } from 'react';

import Button from '../../components/button/button.component';
import GameIntroDialog from '../game-intro/game-intro-dialog.component';
import titleImg from '../../assets/scene/title.png';
import { audioManager } from '../../audio/AudioManager';

import './game-start.styles.scss';

export interface StartRequest {
    online: boolean;
    playerCount: 1 | 2;
}

interface GameStartProps {
    /** Fired at the end of the stage-transition animation. `World` creates the
     * right controller (local `Engine` or `NetworkGameClient`) and starts it. */
    onStart: (request: StartRequest) => void;
}

const GameStart = ({ onStart }: GameStartProps) => {
    const [isShowTransitionStage, setIsShowTransitionStage] = useState(false);
    const [showIntro, setShowIntro] = useState(false);

    const runStartSequence = useCallback((request: StartRequest) => {
        setTimeout(() => {
            setIsShowTransitionStage(true);
            setTimeout(() => {
                audioManager.playBg('start');
                setTimeout(() => {
                    onStart(request);
                }, 4500);
            }, 500);
        }, 300);
    }, [onStart]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || showIntro) return;
            e.preventDefault();
            audioManager.playEffect('click');
            runStartSequence({ online: false, playerCount: 1 });
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showIntro, runStartSequence]);

    return (
        <div className='game-start-container'>
            {!isShowTransitionStage && <>
                <img className='title' src={titleImg} alt='title' />
                <div className='game-start-button-container'>
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-1' clickFunction={() => runStartSequence({ online: false, playerCount: 1 })}>1 PLAYER</Button>
                    </div>
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-2' clickFunction={() => runStartSequence({ online: false, playerCount: 2 })}>2 PLAYERS</Button>
                    </div>
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-online' clickFunction={() => runStartSequence({ online: true, playerCount: 2 })}>ONLINE CO-OP</Button>
                    </div>
                </div>
                <Button id='game-intro-btn' clickFunction={() => setShowIntro(true)}>RULES</Button>
            </>}
            {isShowTransitionStage && <div className='stage-container'>
                <div className='stage-bg-up'></div>
                <div className='stage-bg-down'></div>
                <div className='stage-text'>STAGE&nbsp;&nbsp;&nbsp;&nbsp;1</div>
            </div>}
            <GameIntroDialog open={showIntro} onClose={() => setShowIntro(false)} />
        </div>
    )
};

export default GameStart;
