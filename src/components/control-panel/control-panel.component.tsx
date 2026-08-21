import {useAppSelector} from '../../store/hooks';

import {Joystick} from 'react-joystick-component';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';

import './control-panel.styles.scss';
import { Fragment } from 'react';
import type { Engine } from '../../engine/Engine';
import type { Direction } from '../../engine/types';

const FireButton = styled(Button)({
    fontFamily: 'Pixeloid',
    color: 'black',
    borderRadius: '50%',
    width: '80px',
    height: '80px',
    right: '2.5%',
    backgroundColor: 'darkturquoise',
    '&:hover': {
        backgroundColor: 'darkcyan',
    },
});

interface ControlPanelProps {
    type: 'move' | 'fire';
    engine: Engine;
}

const moveKeys: Record<string, Direction> = {
    'LEFT': 'WEST',
    'FORWARD': 'NORTH',
    'RIGHT': 'EAST',
    'BACKWARD': 'SOUTH'
}

const ControlPanel = ({type, engine}: ControlPanelProps) => {
    const status = useAppSelector(state => state.world.status);

    const moveHandler = (direction: Direction | '') => {
        engine.setPlayerInputDirection(direction);
    };

    const stopHandler = () => {
        engine.setPlayerInputDirection('');
    };

    const fireHandler = () => {
        engine.firePlayerBullet();
    };

    return (
        <Fragment>
            {status === 'playing' &&
                <div className='control-panel-container'>
                    {type === 'move'? <Joystick
                        size={80}
                        baseColor="hsl(219, 84%, 56%)"
                        stickColor="hsl(219, 84%, 30%)"
                        move={(e) => moveHandler(e.direction? moveKeys[e.direction]: '')}
                        stop={stopHandler}
                    ></Joystick>
                    :
                    <FireButton variant="contained" onClick={fireHandler}>FIRE</FireButton>}
                </div>
            }
        </Fragment>
    )
};

export default ControlPanel;
