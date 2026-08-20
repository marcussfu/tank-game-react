import {useAppSelector} from '../../store/hooks';
import useAudio from '../../store/hooks/useAudio';

import click from '../../assets/sounds/click.mp3';
import './button.styles.scss';
import type { ReactNode, HTMLAttributes } from 'react';

interface ButtonProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    clickFunction: () => void;
}

const Button = ({children, clickFunction, ...otherProps}: ButtonProps) => {
    const effectVolume = useAppSelector(state => state.settingReducer.effectVolume);
    const clickAudio = useAudio(click, {volume: effectVolume});

    const clickFunctionHandler = () => {
        clickAudio.replay();
        clickFunction();
    }

    return <div className='button-container' onClick={clickFunctionHandler} {...otherProps}>{children}</div>
};

export default Button;
