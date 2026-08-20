import {useEffect, useRef, Fragment} from 'react';
import {useActions} from '../../store/hooks/useActions';
import {useAppSelector} from '../../store/hooks';

import Map from '../../components/map/map.component';
import Tank from "../../components/tank/tank.component";
import Player from '../../components/player/player.component';
import GameResult from '../../components/game-result/game-result.component';
import GameStart from '../../components/game-start/game-start.component';
import StateBar from '../../components/state-bar/state-bar.component';

import ControlPanel from '../../components/control-panel/control-panel.component';

import {setupTiles} from '../../config/functions';
import {tiles} from '../../config/maps/map_1';

import bgm from '../../assets/sounds/bgm.mp3';
import short_of_time_bgm from '../../assets/sounds/short_of_time_bgm.mp3';
// import game_over_bgm from '../../assets/sounds/game_over_bgm.mp3';
import game_win_bgm from '../../assets/sounds/game_win_bgm.mp3';

import enemyTank from '../../assets/tank/enemyTank.png';

import './world.styles.scss';

const World = () => {
    const {setTiles, setTank, addPlayer} = useActions();
    const tanks = useAppSelector(state => state.tankReducer.tanks);
    const player = useAppSelector(state => state.playerReducer);
    const {game_over, game_win, game_start, short_of_time, game_pause} = useAppSelector(state => state.worldReducer);

    // const bgmAudio = new Audio(bgm);
    // const gameOverAudio = new Audio(game_over_bgm);
    const gameWinAudioRef = useRef(new Audio(game_win_bgm));
    const bgmAudioRef = useRef(new Audio(bgm));

    const bgmAudioInit = () => {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.currentTime = 0;
    };

    useEffect(() => {
        if (short_of_time) {
            bgmAudioRef.current.src = short_of_time_bgm;
            bgmAudioRef.current.load();
            bgmAudioRef.current.play();
            // setBgmAudio(bgmAudio => {
            //     bgmAudio.src = short_of_time_bgm;
            //     bgmAudio.load();
            //     bgmAudio.play();
            // });
        }
    }, [short_of_time]);

    useEffect(() => {
        if (!game_start)
            bgmAudioInit();
        else {
            // bgmAudio.src = bgm;
            // bgmAudio.load();
            // bgmAudio.play();
            // bgmAudio.loop = true;

            // setBgmAudio(bgmAudio => {
            //     bgmAudio.src = bgm;
            //     bgmAudio.load();
            //     bgmAudio.play();
            //     bgmAudio.loop = true;
            // });

            setTiles(setupTiles(tiles));

            const playerState = {
                position: [280, 460] as [number, number],
                direction: 'NORTH' as const,
            }
            addPlayer(playerState);

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
        }
    }, [game_start]);

    useEffect(() => {
        if (game_over || game_win) {
            bgmAudioInit();
            // game_over && gameOverAudio.play();
            if (game_win)
                gameWinAudioRef.current.play();
        }
        else {
            gameWinAudioRef.current.pause();
            gameWinAudioRef.current.currentTime = 0;

            // gameOverAudio.pause();
            // gameOverAudio.currentTime = 0;
        }

    }, [game_over, game_win]);

    // const orientationChange = (e) => {
    //     // setOrientationType(e.currentTarget.type);
    //     // setOrientationType(Math.abs(window.orientation) == 0? 'portrait':'landscape')
    //     setOrientationType(e.matches? 'portrait':'landscape');
    // }

    return (
        <div className='world-container'>
            <ControlPanel type='move' />
            <div className='playground-container'>
                {game_start?
                    <>
                        {(!game_over && !game_win) && <Fragment>
                            <Map />
                            {(!game_pause && player.position.length > 0) &&
                                <Player />}
                            {!game_pause && tanks.map(tank =>
                                <Tank key={tank.key_index} tank={{...tank, imageUrl: enemyTank}} />)}
                        </Fragment>}

                        {(game_over || game_win) && <GameResult />}
                        <StateBar />
                    </>
                    :
                    <>
                        <GameStart />
                    </>
                }
            </div>
            <ControlPanel type='fire' />
        </div>
    )
}

export default World;
