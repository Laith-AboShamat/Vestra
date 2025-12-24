import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#00BFA5' },
    secondary: { main: '#FF6B6B' },
    background: {
      default: '#f5f7f8',
      paper: '#ffffff'
    },
    text: {
      primary: '#2D3436',
      secondary: '#5f6770'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
        }
      }
    }
  }
});

export default theme;
