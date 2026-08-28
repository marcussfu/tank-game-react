import { useAppSelector } from '../../store/hooks';

import './lives-display.styles.scss';

/** Pure display, same pattern as Timing — renders whatever `hudSlice` lives
 * counts the engineBridge last mirrored from the engine's `livesChanged`
 * events. Solo game: a single `×N`. Local co-op: a labelled `P1`/`P2` pair
 * (`hud.livesP2` is null in a solo game). */
const LivesDisplay = () => {
    const lives = useAppSelector(state => state.hud.lives);
    const livesP2 = useAppSelector(state => state.hud.livesP2);

    if (livesP2 === null) {
        return <div className="lives-text">×{lives}</div>;
    }

    return (
        <div className="lives-text">
            <span className="lives-p1">P1 ×{lives}</span>
            <span className="lives-p2">P2 ×{livesP2}</span>
        </div>
    );
};

export default LivesDisplay;
