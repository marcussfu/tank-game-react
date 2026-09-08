import { useEffect, useState } from 'react';
import type { NetworkGameClient, NetState } from '../../net/NetworkGameClient';

import './net-status.styles.scss';

interface NetStatusProps {
    client: NetworkGameClient;
}

/** Online-only HUD readout: round-trip latency and whether the co-op partner
 * is currently connected. */
const NetStatus = ({ client }: NetStatusProps) => {
    const [net, setNet] = useState<NetState>(() => client.netState());

    useEffect(() => client.onNetState(setNet), [client]);

    const pingText = net.latencyMs === null ? '—' : `${net.latencyMs}ms`;

    return (
        <div className='net-status'>
            <span className='net-ping' title='round-trip latency'>⚡{pingText}</span>
            <span
                className={net.peerConnected ? 'net-peer net-peer-up' : 'net-peer net-peer-down'}
                title={net.peerConnected ? 'player 2 connected' : 'player 2 disconnected'}
            >
                P2{net.peerConnected ? '●' : '○'}
            </span>
        </div>
    );
};

export default NetStatus;
