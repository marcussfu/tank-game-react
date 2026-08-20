import {ADD_PLAYER, MOVE_PLAYER, HIDE_PLAYER, IS_SHOOTED_PLAYER, SET_NEW_DIR} from '../../config/types'
import type { Direction, Position } from '../../config/types'

export interface PlayerState {
    position: Position;
    direction: Direction | '';
    walkIndex: number;
    hidden: boolean;
    isShooted: boolean;
    newDir: Direction | '';
}

interface AddPlayerAction {
    type: typeof ADD_PLAYER;
    payload: Partial<PlayerState>;
}

interface MovePlayerAction {
    type: typeof MOVE_PLAYER;
    payload: Partial<PlayerState>;
}

interface HidePlayerAction {
    type: typeof HIDE_PLAYER;
    // payload is optional at the type level to faithfully preserve an existing
    // call site that invokes hidePlayer() with no argument (see
    // store/actions/playerAction.ts) — payload ends up `undefined` at runtime,
    // which is bug #5 from the rewrite plan and intentionally NOT fixed in M0.
    payload?: boolean;
}

interface IsShootedPlayerAction {
    type: typeof IS_SHOOTED_PLAYER;
    payload: boolean;
}

interface SetNewDirAction {
    type: typeof SET_NEW_DIR;
    payload: Direction | '';
}

type PlayerAction =
    | AddPlayerAction
    | MovePlayerAction
    | HidePlayerAction
    | IsShootedPlayerAction
    | SetNewDirAction;

const initState: PlayerState = {
    // NOTE: at runtime this is genuinely an empty array until ADD_PLAYER fires
    // (World only mounts <Player/> once `player.position.length > 0`); the
    // `as unknown as Position` cast is a type-only fiction with no runtime
    // effect, needed because strict mode won't let `[]` satisfy the 2-tuple
    // `Position` type used everywhere else. See M0 report for details.
    position: [] as unknown as Position,
    direction: '',
    // spriteLocation: '',
    walkIndex: 0,
    hidden: true,
    isShooted: false,
    newDir: '',
    // bullets: []

    // position: [280, 460],
    // spriteLocation: '0px 60px',
    // direction: 'NORTH',
    // walkIndex: 0,
    // bullets: []
}

export const playerReducer = (state: PlayerState = initState, action: PlayerAction): PlayerState => {
    switch(action.type) {
        case ADD_PLAYER:
            return {...state, ...action.payload};
        case MOVE_PLAYER:
            return {...state, ...action.payload};
        case HIDE_PLAYER:
            return {
                ...state,
                hidden: action.payload as boolean
            }
        case IS_SHOOTED_PLAYER:
            return {
                ...state,
                isShooted: action.payload
            }
        case SET_NEW_DIR:
            return {
                ...state,
                newDir: action.payload
            }
        default:
            return state;
    }
}
