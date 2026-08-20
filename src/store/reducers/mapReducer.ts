import {ADD_TILES, UPDATE_TILES} from '../../config/types';

export interface MapState {
    tiles: number[][];
}

interface AddTilesAction {
    type: typeof ADD_TILES;
    payload: number[][];
}

interface UpdateTilesAction {
    type: typeof UPDATE_TILES;
    payload: number[][];
}

type MapAction = AddTilesAction | UpdateTilesAction;

const intialState: MapState = {
    tiles: []
}

export const mapReducer = (state: MapState = intialState, action: MapAction): MapState => {
    switch(action.type) {
        case ADD_TILES:
            return {
                tiles: [...action.payload]
            }
        case UPDATE_TILES:
            return {
                tiles: [...action.payload]
            }
        default:
            return state
    }
}
