import {GAME_OVER, GAME_WIN, GAME_START, GAME_INIT, GAME_PAUSE, SHORT_OF_TIME} from '../../config/types';

// NOTE: `shot_of_time` (typo'd, missing the 'r') is the field the initial
// state and GAME_INIT actually (re)set, while the SHORT_OF_TIME action sets
// the correctly-spelled `short_of_time` — components read `short_of_time`.
// This mismatch is bug #4 from the rewrite plan and is intentionally
// preserved as-is for M0 (fixing it is M2/M3 scope); both keys are kept on
// the type so the existing behavior typechecks honestly instead of being
// papered over.
export interface WorldState {
    game_over: boolean;
    game_win: boolean;
    game_start: boolean;
    game_pause: boolean;
    shot_of_time: boolean;
    short_of_time?: boolean;
}

interface GameOverAction {
    type: typeof GAME_OVER;
}

interface GameWinAction {
    type: typeof GAME_WIN;
}

interface GameStartAction {
    type: typeof GAME_START;
}

interface ShortOfTimeAction {
    type: typeof SHORT_OF_TIME;
}

interface GamePauseAction {
    type: typeof GAME_PAUSE;
    payload: boolean;
}

interface GameInitAction {
    type: typeof GAME_INIT;
}

type WorldAction =
    | GameOverAction
    | GameWinAction
    | GameStartAction
    | ShortOfTimeAction
    | GamePauseAction
    | GameInitAction;

const intialState: WorldState = {
    game_over: false,
    game_win: false,
    game_start: false,
    game_pause: false,
    shot_of_time: false,
}

export const worldReducer = (state: WorldState = intialState, action: WorldAction): WorldState => {
    switch(action.type) {
        case GAME_OVER:
            return {
                ...state,
                game_over: true
            };
        case GAME_WIN:
            return {
                ...state,
                game_win: true
            };
        case GAME_START:
            return {
                ...state,
                game_start: true
            };
        case SHORT_OF_TIME:
            return {
                ...state,
                short_of_time: true
            };
        case GAME_PAUSE:
            return {
                ...state,
                game_pause: action.payload
            };
        case GAME_INIT:
            return {
                shot_of_time: false,
                game_start: false,
                game_over: false,
                game_win: false,
                game_pause: false
            };
        default:
            return state
    }
}
