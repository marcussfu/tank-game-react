import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';

import { Provider } from 'react-redux';
import store from './store/store';
import { ThemeProvider } from '@mui/material/styles';
import { appTheme } from './app/theme';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={appTheme}>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
