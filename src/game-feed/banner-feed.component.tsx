import { useAppSelector } from '../store/hooks';

import './banner-feed.styles.scss';

/** The arcade callout overlay. Renders whatever line `feedSlice` currently
 * holds; `key={id}` restarts the pop animation on every new banner. World
 * only mounts it while a game is in progress. */
const BannerFeed = () => {
    const current = useAppSelector((state) => state.feed.current);
    if (!current) return null;

    return (
        <div key={current.id} className="banner-feed" role="status">
            {current.text}
        </div>
    );
};

export default BannerFeed;
