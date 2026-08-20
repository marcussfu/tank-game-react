import wallImg from '../assets/tiles/wall.png';
import rockImg from '../assets/tiles/rock.png';
import waterImg from '../assets/tiles/water.png';
import rockCubeImg from '../assets/tiles/rock-cube.png';
import boomImg from '../assets/tiles/boom.png';
import shelterImg from '../assets/tiles/shelter.png';
import starImg from '../assets/tiles/star.png';
import eagleImg from '../assets/tiles/eagle.png';
import flagImg from '../assets/tiles/flag.png';
import playerTankImg from '../assets/tank/playerTank.png';
import enemyTankImg from '../assets/tank/enemyTank.png';
import bulletImg from '../assets/bullet/bullet.png';

const SOURCES = {
    wall: wallImg,
    rock: rockImg,
    water: waterImg,
    'rock-cube': rockCubeImg,
    boom: boomImg,
    shelter: shelterImg,
    star: starImg,
    eagle: eagleImg,
    flag: flagImg,
    playerTank: playerTankImg,
    enemyTank: enemyTankImg,
    bullet: bulletImg,
} as const;

export type SpriteName = keyof typeof SOURCES;

const cache = new Map<SpriteName, HTMLImageElement>();

/** Preloads every sprite used by drawMap/drawEntities. A failed image doesn't
 * block the rest — that tile/entity just won't draw until (if ever) it loads. */
export const loadSprites = (): Promise<void> => {
    const entries = Object.entries(SOURCES) as [SpriteName, string][];
    return Promise.all(
        entries.map(
            ([name, src]) =>
                new Promise<void>(resolve => {
                    const image = new Image();
                    image.onload = () => {
                        cache.set(name, image);
                        resolve();
                    };
                    image.onerror = () => resolve();
                    image.src = src;
                }),
        ),
    ).then(() => undefined);
};

export const getSprite = (name: SpriteName): HTMLImageElement | undefined => cache.get(name);
