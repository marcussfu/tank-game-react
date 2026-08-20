import {useDispatch} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actionCreators from '../actionCreators';
import type { AppDispatch } from '../store';

export const useActions = () => {
    const dispatch = useDispatch<AppDispatch>();

    return bindActionCreators(actionCreators, dispatch);
};
