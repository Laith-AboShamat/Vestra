import { useRef, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  IconButton,
  Stack,
  Divider,
  useMediaQuery,
  Paper
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import SaveIcon from '@mui/icons-material/Save';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DesignCanvas from '../../components/design/ThreeDesignCanvas.jsx';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import DryCleaningIcon from '@mui/icons-material/DryCleaning';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import { TextField } from '@mui/material';

const drawerWidth = 260;

function DesignStudio() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [canvasApi, setCanvasApi] = useState(null);
  const [selectedModel, setSelectedModel] = useState('tee');
  const [garmentColor, setGarmentColor] = useState('#d9d9d9');
  const isMdUp = useMediaQuery('(min-width:900px)');
  const uploadInputRef = useRef(null);

  const handleAddText = () => canvasApi?.addText();
  const handleSave = () => {
    const json = canvasApi?.exportJson?.();
    if (!json) return;

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vestra-design-${new Date().toISOString().replaceAll(':', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleAddGarment = (modelId) => {
    setSelectedModel(modelId);
    canvasApi?.addGarment(modelId);
    if (garmentColor) {
      canvasApi?.setGarmentColor?.(garmentColor);
    }
  };

  const drawerContent = (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Design Tools</Typography>
      <Button variant="contained" color="primary" startIcon={<TextFieldsIcon />} onClick={handleAddText}>
        Add Text
      </Button>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || '');
            canvasApi?.addImage?.(dataUrl);
          };
          reader.readAsDataURL(file);

          // allow re-uploading the same file
          e.target.value = '';
        }}
      />
      <Button
        variant="outlined"
        color="primary"
        startIcon={<ImageIcon />}
        onClick={() => uploadInputRef.current?.click()}
      >
        Upload Image
      </Button>
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>Garment Color</Typography>
        <TextField
          type="color"
          value={garmentColor}
          onChange={(e) => {
            const color = e.target.value;
            setGarmentColor(color);
            canvasApi?.setGarmentColor?.(color);
          }}
          inputProps={{ style: { padding: 6, height: 44, cursor: 'pointer' } }}
          sx={{ width: 120 }}
        />
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Tip: Use the tools above to add elements, then arrange them directly on the canvas.
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        Drag Garment
      </Typography>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', 'tee');
            handleAddGarment('tee');
            canvasApi?.setGarmentColor?.(garmentColor);
          }}
          sx={{
            width: 76,
            height: 76,
            borderRadius: 2,
            border: '1px dashed #cfd8dc',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            backgroundColor: '#f7f9fb'
          }}
        >
          <CheckroomIcon color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Shirt</Typography>
        </Box>

        <Box
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', 'hoodie');
            handleAddGarment('hoodie');
            canvasApi?.setGarmentColor?.(garmentColor);
          }}
          sx={{
            width: 76,
            height: 76,
            borderRadius: 2,
            border: '1px dashed #cfd8dc',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            backgroundColor: '#f7f9fb'
          }}
        >
          <DryCleaningIcon color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Hoodie</Typography>
        </Box>

        <Box
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'copyMove';
            e.dataTransfer.setData('text/plain', 'jacket');
            handleAddGarment('jacket');
            canvasApi?.setGarmentColor?.(garmentColor);
          }}
          sx={{
            width: 76,
            height: 76,
            borderRadius: 2,
            border: '1px dashed #cfd8dc',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            backgroundColor: '#f7f9fb'
          }}
        >
          <SportsBasketballIcon color="primary" sx={{ fontSize: 30 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Jacket</Typography>
        </Box>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {!isMdUp && (
              <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
                <MenuIcon />
              </IconButton>
            )}
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                component="img"
                src="/vestra.png"
                alt="VESTRA logo"
                sx={{ width: 36, height: 36, borderRadius: 1, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}
              />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                VESTRA Design Studio
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="secondary" startIcon={<SaveIcon />} onClick={handleSave}>Save Design</Button>
            <Button variant="contained" color="primary" startIcon={<ShoppingCartIcon />}>Add to Cart</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMdUp ? 'permanent' : 'temporary'}
          open={isMdUp ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              borderRight: '1px solid #e7eaed'
            }
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          mt: 8
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            backgroundColor: 'background.paper',
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            p: { xs: 1.5, md: 2 },
            height: { xs: '80vh', md: '86vh' },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Canvas
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, borderRadius: 2, overflow: 'hidden', border: '1px dashed #cfd8dc' }}>
            <DesignCanvas onReady={(api) => setCanvasApi(api)} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default DesignStudio;
