import {
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StorefrontIcon from '@mui/icons-material/Storefront';

const features = [
  {
    icon: <ColorLensIcon sx={{ color: 'primary.main' }} />,
    title: 'Design Anything',
    body: 'Fabric.js powered editor for tees, hoodies, hats, and totes—ready for your imagination.'
  },
  {
    icon: <RocketLaunchIcon sx={{ color: 'secondary.main' }} />,
    title: 'Production Ready',
    body: 'Export-perfect files and a pipeline built for print-on-demand fulfillment.'
  },
  {
    icon: <StorefrontIcon sx={{ color: 'primary.main' }} />,
    title: 'Launch Your Storefront',
    body: 'Spin up your own mini-store, accept orders, and let VESTRA handle the heavy lifting.'
  }
];

function FeaturesSection() {
  return (
    <Grid container spacing={3}>
      {features.map((feature) => (
        <Grid item xs={12} md={4} key={feature.title}>
          <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 14px 38px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {feature.icon}
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{feature.title}</Typography>
              <Typography variant="body1" color="text.secondary">{feature.body}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default FeaturesSection;
