import {useAppSelector} from '../../store/hooks';
import { Fragment } from 'react';
import MapTile from '../map-tile/map-tile.component';
import Bullets from '../bullets/bullets.component';

import {getTileSprite} from '../../config/constants';

import './map.styles.scss';

const Map = () => {
    const tiles = useAppSelector((state) => state.mapReducer.tiles);
    return (
        <Fragment>
            {tiles.map((row,index) => 
                 <div key={index} className='map-row-container'>
                    {row.map((tile,index) => 
                        <MapTile key={index} tile={getTileSprite(tile)} />
                    )}
                </div> 
            )}
            <Bullets />
        </Fragment>
    )
}

export default Map;