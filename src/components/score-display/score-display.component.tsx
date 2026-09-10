import { useAppSelector } from '../../store/hooks';

import './score-display.styles.scss';

/** Pure display, same pattern as `Timing` / `LivesDisplay` — renders whatever
 * `hudSlice.score` the engineBridge last mirrored from `scoreChanged`. */
const ScoreDisplay = () => {
    const score = useAppSelector((state) => state.hud.score);
    return <div className="score-text">{score.toLocaleString()}</div>;
};

export default ScoreDisplay;
