import { useCallback, useEffect, useState } from 'react';

import Button from '../../components/button/button.component';
import GameIntroDialog from '../game-intro/game-intro-dialog.component';
import Leaderboard from '../leaderboard/leaderboard.component';
import titleImg from '../../assets/scene/title.png';
import { audioManager } from '../../audio/AudioManager';
import { clearSave, loadSave } from '../../services/api';
import { getPlayerKey } from '../../services/playerKey';
import { tipFor } from '../../engine/maps/tips';
import type { SaveRow } from '../../net/apiTypes';

import './game-start.styles.scss';

export interface StartRequest {
    online: boolean;
    playerCount: 1 | 2;
    /** Local resume (CONTINUE) — a saved run to pick back up. */
    resume?: { levelIndex: number; lives: number; score: number };
}

interface GameStartProps {
    /** Fired at the end of the stage-transition animation. `World` creates the
     * right controller (local `Engine` or `NetworkGameClient`) and starts it. */
    onStart: (request: StartRequest) => void;
}

const GameStart = ({ onStart }: GameStartProps) => {
    const [isShowTransitionStage, setIsShowTransitionStage] = useState(false);
    const [showIntro, setShowIntro] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [save, setSave] = useState<SaveRow | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        loadSave(getPlayerKey(), ctrl.signal).then((s) => {
            if (!ctrl.signal.aborted) setSave(s);
        });
        return () => ctrl.abort();
    }, []);

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

    /** A brand-new run abandons any saved one. */
    const startFresh = useCallback((playerCount: 1 | 2, online = false) => {
        void clearSave(getPlayerKey());
        runStartSequence({ online, playerCount });
    }, [runStartSequence]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' || showIntro || showLeaderboard) return;
            e.preventDefault();
            audioManager.playEffect('click');
            startFresh(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showIntro, showLeaderboard, startFresh]);

    return (
        <div className='game-start-container'>
            {!isShowTransitionStage && <>
                <img className='title' src={titleImg} alt='title' />
                <div className='game-start-button-container'>
                    {save && (
                        <div className='game-start-button-content-container'>
                            <div className='select-item-tank1' />
                            <Button
                                id='game-start-btn-continue'
                                clickFunction={() => runStartSequence({ online: false, playerCount: 1, resume: save })}
                            >
                                CONTINUE <small>LV {save.levelIndex + 1}</small>
                            </Button>
                        </div>
                    )}
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-1' clickFunction={() => startFresh(1)}>1 PLAYER</Button>
                    </div>
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-2' clickFunction={() => startFresh(2)}>2 PLAYERS</Button>
                    </div>
                    <div className='game-start-button-content-container'>
                        <div className='select-item-tank1' />
                        <Button id='game-start-btn-online' clickFunction={() => runStartSequence({ online: true, playerCount: 2 })}>ONLINE CO-OP</Button>
                    </div>
                </div>
                <Button id='game-leaderboard-btn' clickFunction={() => setShowLeaderboard(true)}>LEADERBOARD</Button>
                <Button id='game-intro-btn' clickFunction={() => setShowIntro(true)}>RULES</Button>
            </>}
            {isShowTransitionStage && <div className='stage-container'>
                <div className='stage-bg-up'></div>
                <div className='stage-bg-down'></div>
                <div className='stage-text'>
                    <div>STAGE&nbsp;&nbsp;&nbsp;&nbsp;1</div>
                    <div className='stage-tip'>{tipFor(0)}</div>
                </div>
            </div>}
            <GameIntroDialog open={showIntro} onClose={() => setShowIntro(false)} />
            {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
        </div>
    )
};

export default GameStart;
