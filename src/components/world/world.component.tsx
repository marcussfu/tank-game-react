import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { Engine } from '../../engine/Engine';
import type { GameController } from '../../engine/GameController';
import { NetworkGameClient } from '../../net/NetworkGameClient';
import type { NetPhase } from '../../net/NetworkGameClient';
import { WS_URL } from '../../net/wsUrl';
import { engineBridge } from '../../store/engineBridge';
import { audioManager } from '../../audio/AudioManager';
import { bindBanter } from '../../game-feed/bindBanter';
import { bindCloudSave } from '../../services/cloudSave';
import { getPlayerKey } from '../../services/playerKey';

import CanvasStage from '../../render/CanvasStage';
import BannerFeed from '../../game-feed/banner-feed.component';
import GameResult from '../../components/game-result/game-result.component';
import GameStart from '../../components/game-start/game-start.component';
import type { StartRequest } from '../../components/game-start/game-start.component';
import NetworkLobby from '../../components/network-lobby/network-lobby.component';
import StateBar from '../../components/state-bar/state-bar.component';

import ControlPanel from '../../components/control-panel/control-panel.component';

import './world.styles.scss';

const World = () => {
    // The thing running the game: a local `Engine` for solo / same-screen
    // co-op, or a `NetworkGameClient` for online co-op. Swapped by
    // `handleStart` and reset to a fresh local Engine on the way back to the
    // menu. `useState`'s lazy initializer creates the first one exactly once.
    const [controller, setController] = useState<GameController>(() => new Engine());
    // Local-mode only: what to start with, applied once the new controller's
    // engineBridge/audio bindings are in place (see the start effect below).
    // Online mode never auto-starts — the lobby drives it.
    const pendingStart = useRef<{ playerCount: number; resume?: StartRequest['resume'] } | null>(null);
    const [netPhase, setNetPhase] = useState<NetPhase>('closed');

    const dispatch = useAppDispatch();
    const { status, shortOfTime } = useAppSelector(state => state.world);
    const { bgVolume, effectVolume } = useAppSelector(state => state.settings);

    useEffect(() => {
        const unbridge = engineBridge(controller, dispatch);
        // An online game ending (returnToMenu / reconnect giving up) emits
        // gameReset; swap the spent network client back to a live local Engine
        // so the menu's next action has something to run.
        const unswap = controller.on(event => {
            if (event.type === 'gameReset' && controller instanceof NetworkGameClient) {
                setController(new Engine());
            }
        });
        return () => {
            unbridge();
            unswap();
            if (controller instanceof NetworkGameClient) controller.dispose();
        };
    }, [controller, dispatch]);
    useEffect(() => audioManager.bindEngine(controller), [controller]);
    useEffect(() => bindBanter(controller, dispatch), [controller, dispatch]);
    // Mirror local runs to the cloud-save endpoint (online games aren't saved).
    useEffect(() => {
        if (controller instanceof NetworkGameClient) return;
        return bindCloudSave(controller, getPlayerKey());
    }, [controller]);
    useEffect(() => audioManager.setVolumes(bgVolume, effectVolume), [bgVolume, effectVolume]);

    // Track the network client's lobby/connection phase (drives which screen
    // shows). A local Engine has no phase — `showLobby` below is already gated
    // on `netClient`, so a stale value is harmless.
    useEffect(() => {
        if (!(controller instanceof NetworkGameClient)) return;
        return controller.onNetState(s => setNetPhase(s.phase));
    }, [controller]);

    // Runs after the bind effects above on the same commit, so the new
    // controller's `gameStarted` event is never emitted before engineBridge is
    // listening for it.
    useEffect(() => {
        if (pendingStart.current === null) return;
        const { playerCount, resume } = pendingStart.current;
        pendingStart.current = null;
        controller.start(playerCount, resume);
    }, [controller]);

    const handleStart = useCallback(({ online, playerCount, resume }: StartRequest) => {
        if (!online) pendingStart.current = { playerCount, resume };
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
    // Online, but not in a running game yet (or connection is in trouble):
    // the lobby screen owns the view.
    const showLobby = !!netClient && netPhase !== 'playing';

    return (
        <div className='world-container'>
            <ControlPanel type='move' engine={controller} />
            <div className='playground-container'>
                {status === 'menu' && !netClient && <GameStart onStart={handleStart} />}
                {showLobby && <NetworkLobby client={netClient} />}
                {!showLobby && (status === 'playing' || status === 'paused') && <CanvasStage engine={controller} netClient={netClient} />}
                {!showLobby && status === 'playing' && <BannerFeed />}
                {!showLobby && (status === 'won' || status === 'lost') && (
                    <GameResult engine={controller} online={!!netClient} />
                )}
                {!showLobby && status !== 'menu' && <StateBar engine={controller} netClient={netClient} />}
            </div>
            <ControlPanel type='fire' engine={controller} />
        </div>
    )
}

export default World;
