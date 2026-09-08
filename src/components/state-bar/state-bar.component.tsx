import { useAppSelector } from '../../store/hooks';

import IconButton from '@mui/material/IconButton';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import Timing from '../../components/timing/timing.component';
import LivesDisplay from '../../components/lives-display/lives-display.component';
import NetStatus from '../../components/net-status/net-status.component';
import SettingDialog from '../../components/setting-dialog/setting-dialog.component';

import './state-bar.styles.scss';
import type { GameController } from '../../engine/GameController';
import type { NetworkGameClient } from '../../net/NetworkGameClient';

interface StateBarProps {
    engine: GameController;
    /** Set in online mode — adds a latency + peer-status readout. */
    netClient?: NetworkGameClient;
}

const StateBar = ({ engine, netClient }: StateBarProps) => {
    const status = useAppSelector(state => state.world.status);
    const isInGame = status === 'playing' || status === 'paused';

    return (
        <div className='state-bar-container' style={{
            visibility: isInGame ? 'visible': 'hidden'
        }}>
            {isInGame && (
                <IconButton
                    color="primary"
                    aria-label={status === 'paused' ? 'resume' : 'pause'}
                    onClick={() => engine.togglePause()}
                >
                    {status === 'paused' ? <PlayArrowIcon /> : <PauseIcon />}
                </IconButton>
            )}
            <Timing />
            {isInGame && <LivesDisplay />}
            {isInGame && netClient && <NetStatus client={netClient} />}
            <SettingDialog />
        </div>
    )
};

export default StateBar;
