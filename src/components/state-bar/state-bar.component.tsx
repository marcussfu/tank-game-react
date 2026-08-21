import { useAppSelector } from '../../store/hooks';

import IconButton from '@mui/material/IconButton';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import Timing from '../../components/timing/timing.component';
import SettingDialog from '../../components/setting-dialog/setting-dialog.component';

import './state-bar.styles.scss';
import type { Engine } from '../../engine/Engine';

interface StateBarProps {
    engine: Engine;
}

const StateBar = ({engine}: StateBarProps) => {
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
            <SettingDialog />
        </div>
    )
};

export default StateBar;
