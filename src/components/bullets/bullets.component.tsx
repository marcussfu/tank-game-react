import {useAppSelector} from '../../store/hooks';

import Bullet from '../bullet/bullet.component';
import './bullets.styles.scss';

const Bullets = () => {
    const bullets = useAppSelector(state => state.bulletsReducer.bullets);
    return (
        <div className='bullets-container'>
            {bullets.filter(bullet => bullet.display).map((filteredBullet, index) =>
                <Bullet key={index} bullet={filteredBullet} />)}
        </div>
    )
}

export default Bullets;
