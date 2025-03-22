import { MantineThemeOverride } from '@mantine/core';
import { DARK_BG, DARK_CARD_BG, DARK_BORDER, TEXT_PRIMARY } from './colors';

export const theme: MantineThemeOverride = {
  primaryColor: 'teal',
  defaultRadius: 'md',
  colors: {
    blue: [
      '#e6f7ff',
      '#bae7ff',
      '#91d5ff',
      '#69c0ff',
      '#40a9ff',
      '#1890ff',
      '#096dd9',
      '#0050b3',
      '#003a8c',
      '#002766',
    ],
    violet: [
      '#f3e8ff',
      '#e9d5ff',
      '#d8b4fe',
      '#c084fc',
      '#a855f7',
      '#9333ea',
      '#7e22ce',
      '#6b21a8',
      '#581c87',
      '#4c1d95',
    ],
    teal: [
      '#ccfbf1',
      '#99f6e4',
      '#5eead4',
      '#2dd4bf',
      '#14b8a6',
      '#0d9488',
      '#0f766e',
      '#115e59',
      '#134e4a',
      '#042f2e',
    ],
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  fontFamily: 'Roboto, sans-serif',
  headings: {
    fontFamily: 'Roboto, sans-serif',
    fontWeight: '700',
  },
  colorScheme: 'dark',
  components: {
    Button: {
      defaultProps: {
        variant: 'filled',
      },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
    Card: {
      styles: {
        root: {
          backgroundColor: DARK_CARD_BG,
          borderColor: DARK_BORDER,
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          '&:hover': {
            backgroundColor: '#14b8a6 !important',
          },
        },
      },
    },
    AppShell: {
      styles: {
        main: {
          backgroundColor: DARK_BG
        },
        header: {
          backgroundColor: DARK_CARD_BG
        },
        navbar: {
          backgroundColor: DARK_CARD_BG,
          borderRight: `1px solid ${DARK_BORDER}`
        }
      }
    }
  },
}; 