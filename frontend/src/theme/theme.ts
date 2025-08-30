import { createTheme } from '@mui/material/styles';

// Ruru NFT color scheme from https://ruru-nft.netlify.app/
const ruruColors = {
  // Primary purples (main brand colors)
  primaryPurple: '#8A2BE2',    // Deep purple
  purpleLight: '#9B59B6',      // Lighter purple
  purpleDark: '#6A0DAD',       // Darker purple
  
  // Teal/cyan accents
  teal: '#00CED1',             // Bright teal
  tealLight: '#20B2AA',        // Light teal
  tealDark: '#008B8B',         // Dark teal
  
  // Background colors
  darkBg: '#0A0A1A',           // Very dark blue-black
  cardBg: '#1A1A2E',           // Dark card background
  paperBg: '#16213E',          // Slightly lighter dark
  
  // Text colors
  textPrimary: '#FFFFFF',      // White text
  textSecondary: '#B8B8B8',    // Light gray text
  textTertiary: '#888888',     // Medium gray text
  
  // Status colors
  success: '#00FF00',          // Green
  warning: '#FFD700',          // Gold
  error: '#FF6B6B',            // Coral red
};

export const ruruTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: ruruColors.primaryPurple,
      light: ruruColors.purpleLight,
      dark: ruruColors.purpleDark,
    },
    secondary: {
      main: ruruColors.teal,
      light: ruruColors.tealLight,
      dark: ruruColors.tealDark,
    },
    background: {
      default: ruruColors.darkBg,
      paper: ruruColors.cardBg,
    },
    text: {
      primary: ruruColors.textPrimary,
      secondary: ruruColors.textSecondary,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      background: `linear-gradient(45deg, ${ruruColors.primaryPurple}, ${ruruColors.teal})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontWeight: 600,
      color: ruruColors.textPrimary,
    },
    h3: {
      fontWeight: 500,
      color: ruruColors.textPrimary,
    },
    body1: {
      color: ruruColors.textSecondary,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: `linear-gradient(45deg, ${ruruColors.primaryPurple}, ${ruruColors.teal})`,
          '&:hover': {
            background: `linear-gradient(45deg, ${ruruColors.purpleDark}, ${ruruColors.tealDark})`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: ruruColors.cardBg,
          backgroundImage: 'none',
          borderRadius: '16px',
          border: `1px solid rgba(255, 255, 255, 0.1)`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: ruruColors.darkBg,
          backgroundImage: 'none',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
        },
      },
    },
  },
});