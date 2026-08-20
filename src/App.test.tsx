import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import App from './App';
import store from './store/store';

describe('App', () => {
    it('renders the rotate warning', () => {
        render(
            <Provider store={store}>
                <App />
            </Provider>
        );

        expect(screen.getByText(/please rotate your screen to landscape/i)).toBeInTheDocument();
    });
});
