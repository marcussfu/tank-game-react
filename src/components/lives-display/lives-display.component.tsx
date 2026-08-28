import { useAppSelector } from '../../store/hooks';

import './lives-display.styles.scss';

/** Pure display, same pattern as Timing — just renders whatever
 * `hudSlice.lives` the engineBridge last mirrored from the engine's
 * `livesChanged` event. */
const LivesDisplay = () => {
    const lives = useAppSelector(state => state.hud.lives);

    return <div className="lives-text">×{lives}</div>;
};

export default LivesDisplay;
