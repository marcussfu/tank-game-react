import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactElement } from 'react';
import { makeTestStore } from './testStore';
import type { RootState } from '../store/store';

export const renderWithStore = (
    ui: ReactElement,
    preloadedState?: Partial<RootState>,
    options?: RenderOptions,
) => {
    const store = makeTestStore(preloadedState);
    return { store, ...render(<Provider store={store}>{ui}</Provider>, options) };
};
