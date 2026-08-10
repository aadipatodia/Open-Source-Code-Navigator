import { createTheme, alpha } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Brand palette — a calm dark navy with violet/cyan accents (Linear / Vercel-
// inspired) instead of the previous neon-purple-everywhere look.
// ---------------------------------------------------------------------------
export const brand = {
  bg: '#07091a',
  surface: '#0f1330',
  surfaceElevated: '#141a3d',
  surfaceMuted: '#0c1029',
  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(148, 163, 184, 0.28)',

  primary: '#7c5cff',       // violet
  primaryHover: '#6b48ff',
  secondary: '#22d3ee',     // cyan
  accent: '#f472b6',        // pink (used sparingly)

  success: '#10b981',
  warning: '#f59e0b',
  error: '#f43f5e',

  text: '#f8fafc',
  textMuted: '#a5acca',
  textSubtle: '#6f7798',
};

export const brandGradient = `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)`;

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brand.primary,
      dark: brand.primaryHover,
      contrastText: '#ffffff',
    },
    secondary: {
      main: brand.secondary,
      contrastText: '#04121a',
    },
    error: { main: brand.error },
    warning: { main: brand.warning },
    success: { main: brand.success },
    background: {
      default: brand.bg,
      paper: brand.surface,
    },
    text: {
      primary: brand.text,
      secondary: brand.textMuted,
    },
    divider: brand.border,
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.005em' },
    h6: { fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif', fontWeight: 700 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.005em' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brand.bg,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: brand.surface,
          backgroundImage: 'none',
          borderRadius: 18,
          border: `1px solid ${brand.border}`,
          backdropFilter: 'blur(8px)',
        },
        outlined: {
          borderColor: brand.border,
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: alpha(brand.bg, 0.7),
          backgroundImage: 'none',
          borderBottom: `1px solid ${brand.border}`,
          backdropFilter: 'blur(14px)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 18,
          fontWeight: 600,
          transition: 'transform 120ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          background: brandGradient,
          color: '#fff',
          boxShadow: `0 8px 30px ${alpha(brand.primary, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${brand.primaryHover} 0%, ${brand.secondary} 100%)`,
            boxShadow: `0 10px 36px ${alpha(brand.primary, 0.45)}`,
          },
        },
        outlinedPrimary: {
          borderColor: alpha(brand.primary, 0.5),
          color: brand.text,
          '&:hover': {
            borderColor: brand.primary,
            backgroundColor: alpha(brand.primary, 0.08),
          },
        },
        outlined: {
          borderColor: brand.borderStrong,
          color: brand.text,
          '&:hover': {
            borderColor: brand.text,
            backgroundColor: alpha(brand.text, 0.04),
          },
        },
        text: {
          color: brand.textMuted,
          '&:hover': {
            backgroundColor: alpha(brand.text, 0.04),
            color: brand.text,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: brand.textMuted,
          borderRadius: 10,
          transition: 'background 150ms ease, color 150ms ease',
          '&:hover': {
            color: brand.text,
            backgroundColor: alpha(brand.text, 0.06),
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha(brand.surfaceMuted, 0.6),
          color: brand.text,
          transition: 'background 150ms ease, border-color 150ms ease',
          '& fieldset': {
            borderColor: brand.border,
            transition: 'border-color 150ms ease',
          },
          '&:hover fieldset': {
            borderColor: brand.borderStrong,
          },
          '&.Mui-focused fieldset': {
            borderColor: brand.primary,
            borderWidth: '1.5px',
          },
          '&.Mui-disabled': {
            opacity: 0.6,
          },
        },
        input: {
          '&::placeholder': {
            color: brand.textSubtle,
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: brand.textMuted,
          '&.Mui-focused': {
            color: brand.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: alpha(brand.primary, 0.16),
          color: brand.text,
          border: `1px solid ${alpha(brand.primary, 0.35)}`,
        },
        outlined: {
          borderColor: brand.border,
          color: brand.text,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1a1f44',
          color: brand.text,
          border: `1px solid ${brand.border}`,
          fontSize: 12,
          padding: '6px 10px',
          borderRadius: 8,
        },
        arrow: {
          color: '#1a1f44',
        },
      },
    },
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: alpha(brand.surfaceElevated, 0.7),
          border: `1px solid ${brand.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
          marginBottom: 10,
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 56,
          paddingInline: 18,
        },
        content: {
          margin: '14px 0',
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: '6px 18px 18px',
          borderTop: `1px solid ${brand.border}`,
          backgroundColor: alpha(brand.surfaceMuted, 0.45),
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${brand.border}`,
        },
        standardError: {
          backgroundColor: alpha(brand.error, 0.1),
          color: '#fecdd3',
          borderColor: alpha(brand.error, 0.3),
        },
        standardSuccess: {
          backgroundColor: alpha(brand.success, 0.1),
          color: '#a7f3d0',
          borderColor: alpha(brand.success, 0.3),
        },
        standardWarning: {
          backgroundColor: alpha(brand.warning, 0.1),
          color: '#fde68a',
          borderColor: alpha(brand.warning, 0.3),
        },
        standardInfo: {
          backgroundColor: alpha(brand.secondary, 0.1),
          color: '#a5f3fc',
          borderColor: alpha(brand.secondary, 0.3),
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: brand.border },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 10,
          '&.Mui-selected': {
            backgroundColor: alpha(brand.primary, 0.16),
            color: brand.text,
            '& .MuiListItemIcon-root': { color: brand.primary },
          },
          '&.Mui-selected:hover': {
            backgroundColor: alpha(brand.primary, 0.22),
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: alpha(brand.text, 0.08),
        },
        bar: {
          background: brandGradient,
          borderRadius: 999,
        },
      },
    },
  },
});
