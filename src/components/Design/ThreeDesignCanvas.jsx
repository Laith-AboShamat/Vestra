import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Center
} from '@react-three/drei';
import { easing } from 'maath';
import Shirt from './garments/Shirt.jsx';
import Hoodie from './garments/Hoodie.jsx';
import BasketballJacket from './garments/BasketballJacket.jsx';
import * as THREE from 'three';

import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton, Stack, Tooltip } from '@mui/material';

function TextSprite({ text, position, selected, onSelect }) {
  const spriteRef = useRef();

  const texture = useRef(null);
  const material = useRef(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Transparent background (no pill)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Text only
    ctx.font = '700 120px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const content = String(text ?? 'Text').slice(0, 18);
    // light outline to keep readable without background
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(content, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#111111';
    ctx.fillText(content, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    texture.current?.dispose?.();
    texture.current = tex;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
    material.current?.dispose?.();
    material.current = mat;

    if (spriteRef.current) {
      spriteRef.current.material = mat;
      spriteRef.current.scale.set(1.6, 0.42, 1);
    }

    return () => {
      tex.dispose();
      mat.dispose();
    };
  }, [text]);

  return (
    <sprite
      ref={spriteRef}
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* subtle selection ring */}
      {selected && (
        <mesh>
          <planeGeometry args={[1.7, 0.5]} />
          <meshBasicMaterial transparent opacity={0.0} />
        </mesh>
      )}
    </sprite>
  );
}

function ImageSprite({ texture, position, scale, selected, onSelect }) {
  const spriteRef = useRef();
  const material = useMemo(() => new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }), [texture]);

  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.material = material;
      spriteRef.current.scale.set(scale[0], scale[1], 1);
    }
  }, [material, scale]);

  return (
    <sprite
      ref={spriteRef}
      position={position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    />
  );
}

function CameraRig({ children, rotationY }) {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    easing.dampE(group.current.rotation, [0, rotationY, 0], 0.25, delta);
  });

  return <group ref={group}>{children}</group>;
}

function ThreeDesignCanvas({ onReady }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [bgColor] = useState('#ffffff');
  const [garmentColor, setGarmentColor] = useState('#d9d9d9');
  const [showGarment, setShowGarment] = useState(true);
  const [garmentType, setGarmentType] = useState('tee');
  const [rotationY, setRotationY] = useState(0);

  const [elements, setElements] = useState([]); // {id,type,text?,texture?,position,scale?}
  const [selectedElementId, setSelectedElementId] = useState(null);

  const elementsRef = useRef(elements);
  const garmentTypeRef = useRef(garmentType);
  const garmentColorRef = useRef(garmentColor);
  const selectedElementIdRef = useRef(selectedElementId);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    garmentTypeRef.current = garmentType;
  }, [garmentType]);

  useEffect(() => {
    garmentColorRef.current = garmentColor;
  }, [garmentColor]);

  useEffect(() => {
    selectedElementIdRef.current = selectedElementId;
  }, [selectedElementId]);

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedElementId) || null,
    [elements, selectedElementId]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setShowGarment(true);
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);

    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    if (apiRef.current) return;

    const api = {
      addText: (text = 'Text') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setElements((prev) => [
          ...prev,
          {
            id,
            type: 'text',
            text,
            position: [0, 0.65 - prev.filter((p) => p.type === 'text').length * 0.12, 0.9]
          }
        ]);
        setSelectedElementId(id);
      },
      addGarment: (modelId = 'tee') => {
        setGarmentType(modelId);
        setShowGarment(true);
      },
      setGarmentColor: (color) => setGarmentColor(color),
      setBackground: () => null,
      addImage: (dataUrl) => {
        if (!dataUrl) return;
        const loader = new THREE.TextureLoader();
        loader.load(dataUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          setElements((prev) => [
            ...prev,
            {
              id,
              type: 'image',
              texture: tex,
              position: [0, 0.35, 0.9],
              scale: [1.0, 1.0]
            }
          ]);
          setSelectedElementId(id);
        });
      },
      moveSelected: (dx = 0, dy = 0) => {
        const id = selectedElementIdRef.current;
        if (!id) return;
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== id) return el;
            const [x, y, z] = el.position;
            return { ...el, position: [x + dx, y + dy, z] };
          })
        );
      },
      deleteSelected: () => {
        const id = selectedElementIdRef.current;
        if (!id) return;
        setElements((prev) => {
          const target = prev.find((p) => p.id === id);
          if (target?.type === 'image' && target.texture?.dispose) {
            target.texture.dispose();
          }
          return prev.filter((p) => p.id !== id);
        });
        selectedElementIdRef.current = null;
        setSelectedElementId(null);
      },
      exportJson: () => {
        const currentElements = elementsRef.current;
        return {
          version: 1,
          garmentType: garmentTypeRef.current,
          garmentColor: garmentColorRef.current,
          background: '#ffffff',
          elements: currentElements
            .filter((e) => e.type === 'text')
            .map((e) => ({ id: e.id, type: e.type, text: e.text, position: e.position }))
        };
      }
    };

    apiRef.current = api;
    onReady?.(api);
  }, [onReady]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.2, 6.0], fov: 22, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onPointerMissed={() => setSelectedElementId(null)}
      >
        <color attach="background" args={[bgColor]} />
        <hemisphereLight intensity={0.65} color="#ffffff" groundColor="#6b7280" />
        <directionalLight
          castShadow
          intensity={1.15}
          position={[4, 8, 6]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Environment preset="city" />

        <CameraRig rotationY={rotationY}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
            <circleGeometry args={[8, 64]} />
            <meshStandardMaterial color="#f3f4f6" roughness={0.95} metalness={0.0} />
          </mesh>

          <Center>
            {showGarment && (
              <>
                {garmentType === 'hoodie' ? (
                  <Hoodie color={garmentColor} />
                ) : garmentType === 'jacket' ? (
                  <BasketballJacket color={garmentColor} />
                ) : (
                  <Shirt color={garmentColor} />
                )}
              </>
            )}

            {elements.map((el) => {
              if (el.type === 'text') {
                return (
                  <TextSprite
                    key={el.id}
                    position={el.position}
                    text={el.text}
                    selected={el.id === selectedElementId}
                    onSelect={() => setSelectedElementId(el.id)}
                  />
                );
              }
              if (el.type === 'image' && el.texture) {
                return (
                  <ImageSprite
                    key={el.id}
                    position={el.position}
                    texture={el.texture}
                    scale={el.scale || [1, 1]}
                    selected={el.id === selectedElementId}
                    onSelect={() => setSelectedElementId(el.id)}
                  />
                );
              }
              return null;
            })}
          </Center>
        </CameraRig>
      </Canvas>

      {/* Rotation buttons (no mouse rotation) */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          backgroundColor: 'rgba(255,255,255,0.75)',
          borderRadius: 2,
          p: 0.5
        }}
      >
        <Tooltip title="Rotate left">
          <IconButton size="small" onClick={() => setRotationY((v) => v - 0.2)}>
            <RotateLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate right">
          <IconButton size="small" onClick={() => setRotationY((v) => v + 0.2)}>
            <RotateRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset rotation">
          <IconButton size="small" onClick={() => setRotationY(0)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Placement buttons for selected text/image */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: 58,
          right: 10,
          backgroundColor: 'rgba(255,255,255,0.75)',
          borderRadius: 2,
          p: 0.5
        }}
      >
        <Tooltip title="Move up">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0, 0.06)}>
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Move down">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0, -0.06)}>
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Move left">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(-0.06, 0)}>
            <KeyboardArrowLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Move right">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0.06, 0)}>
            <KeyboardArrowRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete selected">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.deleteSelected?.()}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </div>
  );
}

export default ThreeDesignCanvas;
