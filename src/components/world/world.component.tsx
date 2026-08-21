import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { Engine } from '../../engine/Engine';
import { engineBridge } from '../../store/engineBridge';

import CanvasStage from '../../render/CanvasStage';
import GameResult from '../../components/game-result/game-result.component';
import GameStart from '../../components/game-start/game-start.component';
import StateBar from '../../components/state-bar/state-bar.component';

import ControlPanel from '../../components/control-panel/control-panel.component';

import bgm from '../../assets/sounds/bgm.mp3';
import short_of_time_bgm from '../../assets/sounds/short_of_time_bgm.mp3';
import game_win_bgm from '../../assets/sounds/game_win_bgm.mp3';

import './world.styles.scss';

const World = () => {
    // useState's lazy initializer (not useRef + an in-render `if` check) is
    // the React-sanctioned way to create a value exactly once — mutating a
    // ref during render trips `react-hooks/refs`, since renders aren't
    // guaranteed to only run once per commit.
    const [engine] = useState(() => new Engine());

    const dispatch = useAppDispatch();
    const { status, shortOfTime } = useAppSelector(state => state.world);

    const gameWinAudioRef = useRef(new Audio(game_win_bgm));
    const bgmAudioRef = useRef(new Audio(bgm));

    useEffect(() => engineBridge(engine, dispatch), [engine, dispatch]);

    useEffect(() => {
        if (shortOfTime) {
            bgmAudioRef.current.src = short_of_time_bgm;
            bgmAudioRef.current.load();
            bgmAudioRef.current.play();
        }
    }, [shortOfTime]);

    // Ports the DOM version's two separate bgmAudioInit() call sites
    // (`!game_start` and `game_over || game_win`) as one: those conditions
    // were mutually exclusive and together covered every non-'playing' state,
    // since game_over/game_win could never be true while game_start was
    // false (GAME_INIT reset all four together).
    useEffect(() => {
        if (status !== 'playing') {
            bgmAudioRef.current.pause();
            bgmAudioRef.current.currentTime = 0;
        }
    }, [status]);

    useEffect(() => {
        if (status === 'won') {
            gameWinAudioRef.current.play();
        } else {
            gameWinAudioRef.current.pause();
            gameWinAudioRef.current.currentTime = 0;
        }
    }, [status]);

    return (
        <div className='world-container'>
            <ControlPanel type='move' engine={engine} />
            <div className='playground-container'>
                {status === 'menu' && <GameStart engine={engine} />}
                {status === 'playing' && <CanvasStage engine={engine} />}
                {(status === 'won' || status === 'lost') && <GameResult engine={engine} />}
                {status !== 'menu' && <StateBar />}
            </div>
            <ControlPanel type='fire' engine={engine} />
        </div>
    )
}

export default World;
