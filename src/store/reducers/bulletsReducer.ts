import {ADD_BULLET, REMOVE_BULLET, MOVE_BULLET, REMOVE_SPECIFIC_BULLET, REMOVE_UNDISPLAY_BULLET} from '../../config/types';
import type { Direction, Position } from '../../config/types';

export interface Bullet {
    position: Position;
    direction: Direction;
    key_index: number | string;
    is_player: boolean;
    display: boolean;
}

export interface BulletsState {
    bullets: Bullet[];
}

interface AddBulletAction {
    type: typeof ADD_BULLET;
    payload: Bullet;
}

interface RemoveBulletAction {
    type: typeof REMOVE_BULLET;
}

interface MoveBulletAction {
    type: typeof MOVE_BULLET;
    payload: Bullet;
}

interface RemoveSpecificBulletAction {
    type: typeof REMOVE_SPECIFIC_BULLET;
    payload: Bullet['key_index'];
}

interface RemoveUndisplayBulletAction {
    type: typeof REMOVE_UNDISPLAY_BULLET;
}

type BulletsAction =
    | AddBulletAction
    | RemoveBulletAction
    | MoveBulletAction
    | RemoveSpecificBulletAction
    | RemoveUndisplayBulletAction;

const intialState: BulletsState = {
    bullets: [
        // {position: [0,0], direction: '', key_index: '', is_player: false, display: false},
        // {position: [0,0], direction: '', key_index: '', is_player: false, display: false},
        // {position: [0,0], direction: '', key_index: '', is_player: false, display: false},
        // {position: [0,0], direction: '', key_index: '', is_player: false, display: false},
        // {position: [0,0], direction: '', key_index: '', is_player: false, display: false},
    ]
}

export const bulletsReducer = (state: BulletsState = intialState, action: BulletsAction): BulletsState => {
    const moveBullet = (bullet: Bullet): BulletsState => {
        const bulletsClone = [...state.bullets];
        const freeBulletIndex = bulletsClone.findIndex(element => element.key_index === bullet.key_index);

        if (freeBulletIndex >= 0) {
            bulletsClone[freeBulletIndex].position = bullet.position;
            bulletsClone[freeBulletIndex].display = bullet.display;
        }
        return { bullets: bulletsClone }
    };

    const filterOutSpeciflcBullet = (key_index: Bullet['key_index']): BulletsState => {
        const bulletsClone = [...state.bullets];
        const filterResult = bulletsClone.filter(element => element.key_index !== key_index);
        // console.log("filter result: ", filterResult, key_index);
        return { bullets: filterResult };
    }

    const filterUndisplayBullet = (): BulletsState => {
        const bulletsClone = [...state.bullets];
        // const filterResult = bulletsClone.filter(element => element.display);
        const sliceReslt = bulletsClone.slice(Math.floor(bulletsClone.length/2));
        console.log("slice result: ", sliceReslt);
        return { bullets: sliceReslt };
    }

    switch(action.type) {
        case ADD_BULLET:
            // return reuseBulletsPool(action.payload);
            // return Object.assign({}, state, {
            //     bullets: [...state.bullets, action.payload]
            // })
            return {
                bullets: [...state.bullets, action.payload]
            }
        case REMOVE_BULLET:
            return intialState;
        case MOVE_BULLET:
            return moveBullet(action.payload);
        case REMOVE_SPECIFIC_BULLET:
            return filterOutSpeciflcBullet(action.payload);
        case REMOVE_UNDISPLAY_BULLET:
            return filterUndisplayBullet();
        default:
            return state
    }
}
