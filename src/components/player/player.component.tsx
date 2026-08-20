import {useAppSelector} from '../../store/hooks';
import {useActions} from '../../store/hooks/useActions';
import { useState, useEffect, useRef } from 'react';
import {getCurrentPosition, obeserveBoundaries, directionToRotateDegree} from '../../config/functions';
import store from '../../store/store';

import playerTank from '../../assets/tank/playerTank.png';

import {SPRITE_SIZE, MAP_HEIGHT, MAP_WIDTH} from '../../config/constants';
import './player.styles.scss';
import type { Direction, Position } from '../../config/types';

const Player = () => {
    const {position, direction, walkIndex, hidden, isShooted, newDir} = useAppSelector(state => state.playerReducer);
    const tiles = useAppSelector(state => state.mapReducer.tiles);
    const {setTiles, removeTanks, gameWin, movePlayer, hidePlayer, setBullet, isShootedPlayer, setNewDir} = useActions();

    const [rotate, setRotate] = useState(0);
    const [moveQueue, setMoveQueue] = useState<(Direction | '')[]>([]);
    const [moveSpeed] = useState(200);
    const [posRatio, setPosRatio] = useState({widthRatio: 1, heightRatio: 1});
    const [bulletShootedCount, setBulletShootedCount] = useState(0);

    const intervalNewDirRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function dispatchMove(dir: Direction | '', pos: Position) {
        const newWalkIndex = walkIndex >= 1? 0: walkIndex+1;

        movePlayer({
            position: pos,
            direction: dir,
            walkIndex: newWalkIndex
        });
    }

    const obeserveImpassable = (newPos: Position, tiles: number[][]) => {
        const y = newPos[1] / SPRITE_SIZE;
        const x = newPos[0] / SPRITE_SIZE;
        const nextTile = tiles[y][x];

        if (nextTile === 4) {
            tiles[y][x] = 0;
            setTiles(tiles);
            gameWin();
            removeTanks();
        }
        return nextTile < 5;
    };

    const attemptMove = (dir: Direction | '') => {
        setRotate(directionToRotateDegree(dir));
        const newPos = getCurrentPosition(dir, position);

        dispatchMove(dir,
            (obeserveBoundaries(newPos) && obeserveImpassable(newPos, tiles)?
                newPos: position));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        // get current state
        if (!store.getState().worldReducer.game_over &&
            !store.getState().worldReducer.game_win) {
            switch (e.keyCode) {
                case 37: case 65:
                    return setNewDir('WEST');
                case 38: case 87:
                    return setNewDir('NORTH');
                case 39: case 68:
                    return setNewDir('EAST');
                case 40: case 83:
                    return setNewDir('SOUTH');
                // default:
                //     return console.log(e.keyCode);
            }
        }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
        e.preventDefault();
        // get current state
        if (!store.getState().worldReducer.game_over &&
            !store.getState().worldReducer.game_win) {
            switch (e.keyCode) {
                case 37: case 65: case 38: case 87: case 39: case 68: case 40: case 83:
                    return setNewDir('');
                case 32: case 13:
                    return isShootedPlayer(true);
                // default:
                //     return console.log(e.keyCode);
            }
        }
    }

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        }
    }, []);

    useEffect(() => {
        setPosRatio({
            widthRatio: (document.getElementsByClassName('playground-container')[0] as HTMLElement).offsetWidth/MAP_WIDTH,
            heightRatio: (document.getElementsByClassName('playground-container')[0] as HTMLElement).offsetHeight/MAP_HEIGHT
        });

        if (direction !== '')
            hidePlayer(false);
    }, [direction])

    useEffect(() => {
        if (moveQueue.length > 0)
            attemptMove(moveQueue.shift() as Direction | '');
    }, [moveQueue]);

    useEffect(() => {
        if (newDir !== '') {
            setMoveQueue(moveQueue => [...moveQueue, newDir]);
            intervalNewDirRef.current = setInterval(() => {
                setMoveQueue(moveQueue => [...moveQueue, newDir]);
            }, moveSpeed);
        }

        return () => {
            setMoveQueue([]);
            clearInterval(intervalNewDirRef.current as ReturnType<typeof setInterval>);
        }
    }, [newDir, moveSpeed]);

    useEffect(() => {
        if (isShooted) {
            setBulletShootedCount(bulletShootedCount => bulletShootedCount+1);
            // setBullet({
            //     position: getCurrentPosition(direction, position),
            //     direction: direction,
            //     key_index: 'player1_',
            //     is_player: true
            // });
        }
    }, [isShooted]);

    useEffect(() => {
        if (bulletShootedCount > 0) {console.log("player shoot   ", 'player1_' + bulletShootedCount);
            setBullet({
                position: getCurrentPosition(direction, position),
                direction: direction as Direction,
                key_index: 'player1_' + bulletShootedCount,
                is_player: true,
                display: true
            });
        }
    }, [bulletShootedCount])

    return (
        <div className='player' style={{
            top: position[1]*posRatio.heightRatio,
            left: position[0]*posRatio.widthRatio,
            display: hidden? 'none': 'block',
            backgroundImage: `url(${playerTank})`,
            transform: `rotate(${rotate}deg)`
        }}/>
    )
}

export default Player;
