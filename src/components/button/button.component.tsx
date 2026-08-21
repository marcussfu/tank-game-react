import { audioManager } from '../../audio/AudioManager';

import './button.styles.scss';
import type { ReactNode, HTMLAttributes } from 'react';

interface ButtonProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    clickFunction: () => void;
}

const Button = ({children, clickFunction, ...otherProps}: ButtonProps) => {
    const clickFunctionHandler = () => {
        audioManager.playEffect('click');
        clickFunction();
    }

    return <div className='button-container' onClick={clickFunctionHandler} {...otherProps}>{children}</div>
};

export default Button;
