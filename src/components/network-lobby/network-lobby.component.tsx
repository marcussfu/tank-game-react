import { useEffect, useState } from 'react';
import Button from '../button/button.component';
import type { NetworkGameClient, NetState } from '../../net/NetworkGameClient';

import './network-lobby.styles.scss';

interface NetworkLobbyProps {
    client: NetworkGameClient;
}

/**
 * The pre-game / connection-trouble screen for online co-op — shown by `World`
 * whenever the network client's phase is anything but `playing`. A running
 * game replaces it (World renders `CanvasStage` instead once snapshots flow).
 */
const NetworkLobby = ({ client }: NetworkLobbyProps) => {
    const [net, setNet] = useState<NetState>(() => client.netState());

    useEffect(() => client.onNetState(setNet), [client]);

    return (
        <div className='network-lobby-container'>
            {net.phase === 'connecting' && (
                <p className='lobby-line'>CONNECTING…</p>
            )}

            {net.phase === 'lobby' && (
                <>
                    <p className='lobby-line'>WAITING FOR PLAYER 2</p>
                    <p className='lobby-sub'>room: {net.roomId ?? '…'} · you are P{net.playerId + 1}</p>
                    <div className='lobby-actions'>
                        <Button id='lobby-start-solo' clickFunction={() => client.start(1)}>START SOLO</Button>
                        <Button id='lobby-back' clickFunction={() => client.returnToMenu()}>BACK</Button>
                    </div>
                </>
            )}

            {net.phase === 'reconnecting' && (
                <>
                    <p className='lobby-line lobby-warn'>CONNECTION LOST</p>
                    <p className='lobby-sub'>reconnecting… (attempt {net.reconnectAttempt})</p>
                    <div className='lobby-actions'>
                        <Button id='lobby-give-up' clickFunction={() => client.returnToMenu()}>BACK TO MENU</Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default NetworkLobby;
