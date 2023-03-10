import {useSelector} from 'react-redux';
import useAudio from '../../store/hooks/useAudio';

import click from '../../assets/sounds/click.mp3';
import './button.styles.scss';

const Button = ({children, clickFunction, ...otherProps}) => {
    const effectVolume = useSelector(state => state.settingReducer.effectVolume);
    const clickAudio = useAudio(click, {volume: effectVolume});

    const clickFunctionHandler = () => {
        clickAudio.currentTime = 0;
        clickAudio.play();
        clickFunction();
    }

    return <div className='button-container' onClick={clickFunctionHandler} {...otherProps}>{children}</div>
};

export default Button;