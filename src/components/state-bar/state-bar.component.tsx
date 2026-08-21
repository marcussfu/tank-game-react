import { useAppSelector } from '../../store/hooks';

import Timing from '../../components/timing/timing.component';
import SettingDialog from '../../components/setting-dialog/setting-dialog.component';

import './state-bar.styles.scss';

const StateBar = () => {
    const status = useAppSelector(state => state.world.status);

    return (
        <div className='state-bar-container' style={{
            visibility: status === 'playing'? 'visible': 'hidden'
        }}>
            <Timing />
            <SettingDialog />
        </div>
    )
};

export default StateBar;
