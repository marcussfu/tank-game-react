import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { Engine } from '../../engine/Engine';
import { engineBridge } from '../../store/engineBridge';
import { audioManager } from '../../audio/AudioManager';

import CanvasStage from '../../render/CanvasStage';
import GameResult from '../../components/game-result/game-result.component';
import GameStart from '../../components/game-start/game-start.component';
import StateBar from '../../components/state-bar/state-bar.component';

import ControlPanel from '../../components/control-panel/control-panel.component';

import './world.styles.scss';

const World = () => {
    // useState's lazy initializer (not useRef + an in-render `if` check) is
    // the React-sanctioned way to create a value exactly once — mutating a
    // ref during render trips `react-hooks/refs`, since renders aren't
    // guaranteed to only run once per commit.
    const [engine] = useState(() => new Engine());

    const dispatch = useAppDispatch();
    const { status, shortOfTime } = useAppSelector(state => state.world);
    const { bgVolume, effectVolume } = useAppSelector(state => state.settings);

    useEffect(() => engineBridge(engine, dispatch), [engine, dispatch]);
    useEffect(() => audioManager.bindEngine(engine), [engine]);
    useEffect(() => audioManager.setVolumes(bgVolume, effectVolume), [bgVolume, effectVolume]);

    // Sole place background music reacts to game status (replaces the DOM
    // version's duplicated ownership — World *and* GameResult each
    // independently played their own `game_win_bgm` on a win, so it audibly
    // played twice at once). 'paused' is deliberately absent: whichever
    // track was already playing keeps playing, unpaused, through a pause.
    useEffect(() => {
        if (status === 'won') audioManager.playBg('win');
        else if (status === 'lost') audioManager.playBg('lose');
        else if (status === 'playing' && shortOfTime) audioManager.playBg('shortOfTime');
        else if (status === 'playing') audioManager.playBg('main');
        else if (status === 'menu') audioManager.stopBg();
    }, [status, shortOfTime]);

    return (
        <div className='world-container'>
            <ControlPanel type='move' engine={engine} />
            <div className='playground-container'>
                {status === 'menu' && <GameStart engine={engine} />}
                {(status === 'playing' || status === 'paused') && <CanvasStage engine={engine} />}
                {(status === 'won' || status === 'lost') && <GameResult engine={engine} />}
                {status !== 'menu' && <StateBar engine={engine} />}
            </div>
            <ControlPanel type='fire' engine={engine} />
        </div>
    )
}

export default World;
