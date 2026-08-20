import {ADD_TANK, UPDATE_TANK, REMOVE_TANK, REMOVE_TANKS} from '../../config/types';
import type { Direction, Position } from '../../config/types';

export interface Tank {
    position: Position;
    direction: Direction;
    key_index: number;
}

export interface TankState {
    tanks: Tank[];
}

interface AddTankAction {
    type: typeof ADD_TANK;
    payload: Tank;
}

interface UpdateTankAction {
    type: typeof UPDATE_TANK;
    payload: Partial<Tank> & Pick<Tank, 'key_index'>;
}

interface RemoveTankAction {
    type: typeof REMOVE_TANK;
    payload: Tank['key_index'];
}

interface RemoveTanksAction {
    type: typeof REMOVE_TANKS;
}

type TankAction = AddTankAction | UpdateTankAction | RemoveTankAction | RemoveTanksAction;

const intialState: TankState = {
    tanks: []
}

export const tankReducer = (state: TankState = intialState, action: TankAction): TankState => {
    switch(action.type) {
        case ADD_TANK:
            return Object.assign({}, state, {
                tanks: [...state.tanks, action.payload]
            })
        case UPDATE_TANK:
            return Object.assign({}, state, {
                tanks:
                    state.tanks.map(tank => {
                        if (tank.key_index === action.payload.key_index) {
                            return Object.assign({}, tank, action.payload)
                        }
                        return tank
                    })
            })
        case REMOVE_TANK:
            return Object.assign({}, state, {
                tanks:
                    state.tanks.filter(tank => tank.key_index !== action.payload)
            })
        case REMOVE_TANKS:
            return {
                tanks: []
            }
        default:
            return state
    }
}
