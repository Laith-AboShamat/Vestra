import {
  Box,
  Button,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';

function HeroSection() {
  const navigate = useNavigate();

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
      <Box sx={{ flex: 1 }}>
        <Chip label="Wear Your Imagination" color="primary" variant="outlined" sx={{ mb: 2, fontWeight: 700 }} />
        <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05, mb: 2 }}>
          Design. Launch. Wear. <br /> All in one canvas.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3, maxWidth: 520 }}>
          VESTRA turns bold ideas into premium apparel with a guided design studio, instant previews, and fulfillment-ready exports.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/design')}
          >
            Start Designing
          </Button>
          <Button variant="outlined" color="secondary" size="large" onClick={() => navigate('/design')}>
            View Editor
          </Button>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="primary" />
            <Typography variant="body1" fontWeight={700}>Print-ready outputs</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="secondary" />
            <Typography variant="body1" fontWeight={700}>No design experience needed</Typography>
          </Stack>
        </Stack>
      </Box>
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 20px 70px rgba(0,0,0,0.12)'
        }}
      >
        <Box
          component="img"
          src="/vestra-background.png"
          alt="VESTRA showcase"
          sx={{ width: '100%', display: 'block' }}
        />
      </Box>
    </Stack>
  );
}

export default HeroSection;
