import { useAppSelector } from '../../store/hooks';

import './timing.styles.scss';

const getTimingText = (timeValue: number) => {
    const min = Math.floor(timeValue / 60);
    const sec = timeValue % 60;
    return min + ' : ' + (sec < 10 ? '0' + sec : sec);
};

/** Pure display now — the countdown, enemy spawn waves, and time-out
 * game-over are all handled inside Engine's tick(); this just renders
 * whatever `hudSlice.timeRemainingSec` the engineBridge last mirrored. */
const Timing = () => {
    const timeRemainingSec = useAppSelector(state => state.hud.timeRemainingSec);

    return (
        <div className="timing-text" style={{
            color: timeRemainingSec < 20 ? 'red' : 'orange'
        }}>{getTimingText(timeRemainingSec)}</div>
    )
};

export default Timing;
