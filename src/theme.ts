// src/theme.ts
import { createTheme } from '@mui/material/styles';
// Fix import by adding explicit .js extension
import colors from './colors.js'; 

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    background: {
      default: colors.lightBg,
      paper: '#FFFFFF',
    },
    text: {
      primary: colors.textDark,
    },
    error: {
      main: colors.destructive,
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
          },
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.textLight, // Using Columbia blue as primary in dark mode
    },
    secondary: {
      main: colors.oddBlock, // Using lighter cool gray in dark mode
    },
    background: {
      default: colors.darkBg,
      paper: colors.secondary, // Ebony color for cards and paper elements
    },
    text: {
      primary: colors.textLight,
      secondary: colors.evenBlock,
    },
    error: {
      main: colors.destructiveDark,
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          backgroundColor: colors.textLight,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.evenBlock,
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
          },
        },
        outlined: {
          borderColor: colors.textLight,
          color: colors.textLight,
          '&:hover': {
            borderColor: colors.evenBlock,
            color: colors.evenBlock,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.oddBlockDark,
          borderRadius: '12px',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.darkBg,
        },
      },
    },
  },
});

export { lightTheme, darkTheme };