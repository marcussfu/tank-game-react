import {combineReducers} from 'redux';

import {mapReducer} from './mapReducer';
import {tankReducer} from './tankReducer';
import {bulletsReducer} from './bulletsReducer';
import {worldReducer} from './worldReducer';
import {playerReducer} from './playerReducer';
import {settingReducer} from './settingReducer';

const rootReducer = combineReducers({mapReducer, tankReducer,
    bulletsReducer, worldReducer, playerReducer, settingReducer});

export default rootReducer;
export type RootReducerState = ReturnType<typeof rootReducer>;
