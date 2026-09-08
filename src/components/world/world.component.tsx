import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { Engine } from '../../engine/Engine';
import type { GameController } from '../../engine/GameController';
import { NetworkGameClient } from '../../net/NetworkGameClient';
import { WS_URL } from '../../net/wsUrl';
import { engineBridge } from '../../store/engineBridge';
import { audioManager } from '../../audio/AudioManager';

import CanvasStage from '../../render/CanvasStage';
import GameResult from '../../components/game-result/game-result.component';
import GameStart from '../../components/game-start/game-start.component';
import type { StartRequest } from '../../components/game-start/game-start.component';
import StateBar from '../../components/state-bar/state-bar.component';

import ControlPanel from '../../components/control-panel/control-panel.component';

import './world.styles.scss';

const World = () => {
    // The thing running the game: a local `Engine` for solo / same-screen
    // co-op, or a `NetworkGameClient` for online co-op. Swapped by
    // `handleStart` and reset to a fresh local Engine on the way back to the
    // menu. `useState`'s lazy initializer creates the first one exactly once.
    const [controller, setController] = useState<GameController>(() => new Engine());
    // The player count to start with, applied once the new controller's
    // engineBridge/audio bindings are in place (see the start effect below).
    const pendingStart = useRef<number | null>(null);

    const dispatch = useAppDispatch();
    const { status, shortOfTime } = useAppSelector(state => state.world);
    const { bgVolume, effectVolume } = useAppSelector(state => state.settings);

    useEffect(() => {
        const unbridge = engineBridge(controller, dispatch);
        // An online game ending (returnToMenu / socket close) emits gameReset;
        // swap the spent network client back to a live local Engine so the
        // menu's next action has something to run.
        const unswap = controller.on(event => {
            if (event.type === 'gameReset' && controller instanceof NetworkGameClient) {
                setController(new Engine());
            }
        });
        return () => { unbridge(); unswap(); };
    }, [controller, dispatch]);
    useEffect(() => audioManager.bindEngine(controller), [controller]);
    useEffect(() => audioManager.setVolumes(bgVolume, effectVolume), [bgVolume, effectVolume]);

    // Runs after the two bind effects above on the same commit, so the new
    // controller's `gameStarted` event is never emitted before engineBridge is
    // listening for it.
    useEffect(() => {
        if (pendingStart.current === null) return;
        const count = pendingStart.current;
        pendingStart.current = null;
        controller.start(count);
    }, [controller]);

    const handleStart = useCallback(({ online, playerCount }: StartRequest) => {
        pendingStart.current = playerCount;
        setController(online ? new NetworkGameClient(WS_URL) : new Engine());
    }, []);

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

    const netClient = controller instanceof NetworkGameClient ? controller : undefined;

    return (
        <div className='world-container'>
            <ControlPanel type='move' engine={controller} />
            <div className='playground-container'>
                {status === 'menu' && <GameStart onStart={handleStart} />}
                {(status === 'playing' || status === 'paused') && <CanvasStage engine={controller} netClient={netClient} />}
                {(status === 'won' || status === 'lost') && <GameResult engine={controller} />}
                {status !== 'menu' && <StateBar engine={controller} />}
            </div>
            <ControlPanel type='fire' engine={controller} />
        </div>
    )
}

export default World;
