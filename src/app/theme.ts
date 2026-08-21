import { createTheme } from '@mui/material/styles';

// Mirrors the palette in app/_tokens.scss (kept in sync by hand — not worth
// a CSS-custom-properties bridge for this few values). Without this, MUI
// components (SettingDialog, VolumeSlider, StateBar's pause button, the fire
// button) rendered in MUI's stock light/Roboto look, clashing with the rest
// of the app's dark pixel-art SCSS styling — there was no ThemeProvider
// anywhere in the app before this.
export const appTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#000000', // $color-bg-black
            paper: '#1a1a1a',
        },
        primary: {
            main: '#00CED1', // darkturquoise — $color-accent
            dark: '#008B8B', // darkcyan — $color-accent-hover
        },
        error: {
            main: '#ff0000', // $color-danger
        },
    },
    typography: {
        fontFamily: 'Pixeloid, sans-serif', // $font-pixeloid
    },
});
