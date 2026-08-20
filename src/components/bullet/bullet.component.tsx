import {useState, useEffect, useRef} from 'react';
import {useAppSelector} from '../../store/hooks';
import {useActions} from '../../store/hooks/useActions';

// import React from 'react'
import {getCurrentPosition, directionToRotateDegree,
    obeserveBoundaries} from '../../config/functions';
import store from '../../store/store';

import {SPRITE_SIZE, FLAG_POSITION, MAP_HEIGHT, MAP_WIDTH} from '../../config/constants';
import BulletPic from '../../assets/bullet/bullet.png';

// import find_star from '../../assets/sounds/find_star.mp3';
// import crash from '../../assets/sounds/crash.mp3';
import './bullet.styles.scss';

import type { Bullet as BulletType } from '../../store/reducers/bulletsReducer';
import type { Position } from '../../config/types';

interface BulletProps {
    bullet: BulletType;
}

type BulletState = BulletType & { rotate: number };

const Bullet = ({bullet}: BulletProps) => {
    const tiles = useAppSelector(state => state.mapReducer.tiles);
    const tanks = useAppSelector(state => state.tankReducer.tanks);
    const player = useAppSelector(state => state.playerReducer);
    // const bullets = useSelector(state => state.bulletsReducer.bullets);

    const {setTiles, updateTiles, removeTank, removeTanks,
        gameOver, gameWin, hidePlayer, removeBullet, isShootedPlayer
    } = useActions();

    const [bulletStates, setBulletStates] = useState<BulletState>({
        ...bullet,
        rotate: directionToRotateDegree(bullet.direction),
    });

    const [isRunningInterval, setIsRunningInterval] = useState(true);
    const [posRatio, setPosRatio] = useState({widthRatio: 1, heightRatio: 1});
    // const [filteredBullets, setFilterBullets] = useState([]);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const tick = () => {
        setBulletStates(bulletStates => ({
            ...bulletStates,
            position: getCurrentPosition(bulletStates.direction, bulletStates.position)
        }));
    };

    const gameOverTotal = () => {
        setTimeout(() => {
            gameOver();
            removeTanks();
            removeBullet();
        }, 500);
    };

    const hitTank = (tiles: number[][], newPos: Position, x: number, y: number) => {
        if (!tanks || !bullet.is_player) return;
        tanks.forEach(tank => {
            if (JSON.stringify(tank.position) === JSON.stringify(newPos)) {
                console.log('hit tank', tank.key_index);
                releaseBoom(tiles, x, y);

                removeTank(tank.key_index);
                // get current tanks state
                if (store.getState().tankReducer.tanks.length <= 0) {
                    gameWin();
                    removeBullet();
                }
            }
        })
    };

    const hitPlayer = (tiles: number[][], newPos: Position, x: number, y: number) => {
        if (bullet.is_player) return;
        if (JSON.stringify(player.position) === JSON.stringify(newPos)) {
            console.log('hit player at', newPos);
            releaseBoom(tiles, x, y);
            hidePlayer();
            gameOverTotal();
        }
    };

    const changeTiles = (tiles: number[][], newPos: Position, x: number, y: number) => {
        const nextTile = tiles[y][x];
        switch(Math.round(nextTile)) {
            case 5:
                releaseBoom(tiles, x, y);
                break;
            case 10:
                FLAG_POSITION.map((row, index) =>
                    tiles[row[0]][row[1]] = 11 + 0.1*(index+1))
                setTiles(tiles);
                gameOverTotal();
                break;
            case 12:
                releaseBoom(tiles, x, y);
                // const findStarAudio = new Audio(find_star);
                // findStarAudio.play();

                setTimeout(() => {
                    tiles[y][x] = 4;
                    setTiles(tiles);
                }, 100);
                console.log('find treasure at', newPos);
                break;
            default:
                break;
        }
    };

    const releaseBoom = (tiles: number[][], x: number, y: number) => {
        // const crashAudio = new Audio(crash);
        // crashAudio.play();

        const forest = tiles[y][x] === 1? true: false;
        tiles[y][x] = 9;
        setTiles(tiles);

        setTimeout(() => {
            tiles[y][x] = forest? 1:0;
            updateTiles(tiles);
        }, 100)
    };

    const obeserveImpassable = (newPos: Position): boolean => {
        const y = newPos[1] / SPRITE_SIZE;
        const x = newPos[0] / SPRITE_SIZE;
        const nextTile = tiles[y][x]
        hitTank(tiles, newPos, x, y);
        hitPlayer(tiles, newPos, x, y);
        changeTiles(tiles, newPos, x, y);
        return nextTile < 5;
    };

    useEffect(() => {
        if (isRunningInterval)
            intervalRef.current = setInterval(() => tick(), 50);
        else
            clearInterval(intervalRef.current as ReturnType<typeof setInterval>);

        setBulletStates(bulletStates => ({
            ...bulletStates,
            display: isRunningInterval
        }));
        return () => clearInterval(intervalRef.current as ReturnType<typeof setInterval>);
    }, [isRunningInterval]);

    useEffect(() => {
        setPosRatio({
            widthRatio: (document.getElementsByClassName('bullets-container')[0] as HTMLElement).offsetWidth/MAP_WIDTH,
            heightRatio: (document.getElementsByClassName('bullets-container')[0] as HTMLElement).offsetHeight/MAP_HEIGHT
        });

        if (!(obeserveBoundaries(bulletStates.position) && obeserveImpassable(bulletStates.position))) {
            setIsRunningInterval(false);
            if (bulletStates.is_player) {
                // console.log("LLLLLLL   ", bulletStates.key_index, bulletStates.is_player, false);
                isShootedPlayer(false);
            }
            // console.log("want to remove   ", bulletStates.key_index, bulletStates.is_player);
            // removeSpecificBullet(bulletStates.key_index);
        }
        // moveBullet({
        //     position: bulletStates.position,
        //     display: isDisplay,
        //     key_index: bulletStates.key_index
        // })
    }, [bulletStates]);

    return (
        <div className='bullet' style={{
            top: bulletStates.position[1]*posRatio.heightRatio,
            left: bulletStates.position[0]*posRatio.widthRatio,
            display: bulletStates.display? 'block':'none',
            backgroundImage: `url(${BulletPic})`,
            transform: `rotate(${bulletStates.rotate}deg)`,
        }}/>
    )
}

export default Bullet;
