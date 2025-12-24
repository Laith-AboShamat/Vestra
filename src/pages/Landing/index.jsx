import { Box, Container, Typography } from '@mui/material';
import HeroSection from '../../components/Landing/HeroSection.jsx';
import FeaturesSection from '../../components/Landing/FeaturesSection.jsx';

function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'radial-gradient(circle at 20% 20%, rgba(0,191,165,0.08), transparent 30%), radial-gradient(circle at 80% 0%, rgba(255,107,107,0.10), transparent 32%), #f5f7f8' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <HeroSection />
        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Why VESTRA</Typography>
          <FeaturesSection />
        </Box>
      </Container>
    </Box>
  );
}

export default LandingPage;
