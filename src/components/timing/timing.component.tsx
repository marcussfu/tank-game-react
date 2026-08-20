
import { useAppSelector } from '../../store/hooks';
import { useEffect, useState, useRef } from 'react';
import { useActions } from '../../store/hooks/useActions';

import {TIME_LIMIT} from '../../config/constants'

// import game_over_bgm from '../../assets/sounds/game_over_bgm.mp3';
import './timing.styles.scss';

// const gameOverAudio = new Audio(game_over_bgm);

const Timing = () => {
    const {game_over, game_win} = useAppSelector(state => state.worldReducer);
    const [timeValue, settimeValue] = useState(TIME_LIMIT);

    const {gameOver, removeTanks, removeBullet, shortOfTime, setTank} = useActions();

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const createEnemyTank = () => {
        setTank({
            position: [0,0],
            direction: 'SOUTH',
            key_index: Date.now()
        });

        setTank({
            position: [780,460],
            direction: 'NORTH',
            key_index: Date.now()+1
        });

        setTank({
            position: [740,0],
            direction: 'WEST',
            key_index: Date.now()+2
        });
    };

    useEffect(() => {
        if (!game_over && !game_win) {
            intervalRef.current = setInterval(() => {
                settimeValue(timeValue => timeValue - 1);
            }, 1000);
            // gameOverAudio.pause();
            // gameOverAudio.currentTime = 0;
        }
        else {
            // gameOverAudio.play();
            clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
        }
        return () => clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
    }, [game_over, game_win]);

    useEffect(() => {
        if (timeValue < 20 && timeValue >= 18)
            shortOfTime();
        else if (timeValue < 1) {
            gameOver();
            removeTanks();
            removeBullet();
        }

        if (timeValue < 180 && timeValue > 0) {
            // if (timeValue % 30 === 0)
            //     removeUndisplayBullet();
            if (timeValue % 60 === 0)
                createEnemyTank();
        }
    }, [timeValue]);

    const getTimingText = (timeValue: number) => {
        const min = Math.floor(timeValue/60);
        const sec = timeValue % 60;
        return  min + ' : ' + (sec < 10? '0' + sec: sec);
    };

    return (
        <div className="timing-text" style={{
            color: timeValue < 20? 'red': 'orange'
        }}>{getTimingText(timeValue)}</div>
    )
};

export default Timing;
