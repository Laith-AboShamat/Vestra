import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame } from '@react-three/fiber';
import {
  Environment,
  Center,
  Decal
} from '@react-three/drei';
import { easing } from 'maath';
import Shirt from './garments/Shirt.jsx';
import Hoodie from './garments/Hoodie.jsx';
import * as THREE from 'three';

import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton, Stack, Tooltip } from '@mui/material';

function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 120px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const content = String(text ?? 'Text').slice(0, 18);
  // "Screen print" look: dark ink with soft edge + grain.
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#121212';
  ctx.fillText(content, canvas.width / 2, canvas.height / 2);

  // Add subtle ink grain *inside* the text only.
  ctx.globalCompositeOperation = 'source-in';
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 1 + Math.random() * 2;
    const h = 1 + Math.random() * 2;
    const g = 12 + Math.random() * 20;
    ctx.fillStyle = `rgba(${g},${g},${g},${0.05 + Math.random() * 0.05})`;
    ctx.fillRect(x, y, w, h);
  }

  // Tiny distress: remove a few specks to feel printed on fabric.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 320; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 0.4 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function TextDecal({ el, selectedId, setSelectedId, draggingIdRef, updateDraggingFromPointerEvent }) {
  const tex = useMemo(() => createTextTexture(el.text), [el.text]);

  useEffect(() => {
    return () => {
      tex?.dispose?.();
    };
  }, [tex]);

  const s = typeof el.scale === 'number' ? el.scale : 1;

  return (
    <Decal
      position={el.position}
      rotation={[0, 0, 0]}
      scale={[0.7 * s, 0.22 * s, 0.6]}
      onPointerDown={(e) => {
        e.stopPropagation();
        setSelectedId(el.id);
        draggingIdRef.current = el.id;
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        updateDraggingFromPointerEvent(e);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        draggingIdRef.current = null;
      }}
      onPointerLeave={() => {
        draggingIdRef.current = null;
      }}
    >
      <meshStandardMaterial
        transparent
        map={tex}
        roughness={1}
        metalness={0.0}
        opacity={0.9}
        blending={THREE.MultiplyBlending}
        premultipliedAlpha
        polygonOffset
        polygonOffsetFactor={-4}
        depthWrite={false}
        alphaTest={0.05}
      />
    </Decal>
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
  const stageRef = useRef(null);
  const draggingIdRef = useRef(null);
  const rotateIntervalRef = useRef(null);
  const [bgColor] = useState('#ffffff');
  const [garmentColor, setGarmentColor] = useState('#d9d9d9');
  const [showGarment, setShowGarment] = useState(true);
  const [garmentType, setGarmentType] = useState('tee');
  const [rotationY, setRotationY] = useState(0);
  const [garmentMesh, setGarmentMesh] = useState(null);
  const garmentMeshRef = useRef(null);

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
    garmentMeshRef.current = garmentMesh;
  }, [garmentMesh]);

  useEffect(() => {
    // When garment type changes, we wait for a new mesh callback.
    setGarmentMesh(null);
  }, [garmentType]);

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
        const mesh = garmentMeshRef.current;
        // Place roughly on the chest/front by default.
        let position = [0, 0.6, 0.25];
        if (mesh?.isMesh && mesh.geometry) {
          try {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const bb = mesh.geometry.boundingBox;
            if (bb) {
              const size = new THREE.Vector3();
              bb.getSize(size);
              const center = new THREE.Vector3();
              bb.getCenter(center);
              position = [
                center.x,
                center.y + size.y * 0.15,
                bb.max.z - size.z * 0.08
              ];
            }
          } catch {
            // ignore
          }
        }

        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setElements((prev) => [
          ...prev,
          {
            id,
            type: 'text',
            text,
            position,
            scale: 1
          }
        ]);
        setSelectedElementId(id);
      },
      addGarment: (modelId = 'tee') => {
        // Only tee + hoodie are supported.
        setGarmentType(modelId === 'hoodie' ? 'hoodie' : 'tee');
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
              position: [0, 0.35, 0.25],
              scale: [1.0, 1.0]
            }
          ]);
          setSelectedElementId(id);
        });
      },
      setSelectedText: (text) => {
        const id = selectedElementIdRef.current;
        if (!id) return;
        const nextText = String(text ?? '');
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== id) return el;
            if (el.type !== 'text') return el;
            return { ...el, text: nextText };
          })
        );
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
      scaleSelected: (mult = 1) => {
        const id = selectedElementIdRef.current;
        if (!id) return;
        const m = Number(mult);
        if (!Number.isFinite(m) || m <= 0) return;
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== id) return el;
            if (el.type === 'text') {
              const s = typeof el.scale === 'number' ? el.scale : 1;
              const next = Math.max(0.2, Math.min(6, s * m));
              return { ...el, scale: next };
            }
            if (el.type === 'image') {
              const s = Array.isArray(el.scale) ? el.scale : [1, 1];
              const next = [Math.max(0.2, Math.min(6, s[0] * m)), Math.max(0.2, Math.min(6, s[1] * m))];
              return { ...el, scale: next };
            }
            return el;
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

  useEffect(() => {
    return () => {
      if (rotateIntervalRef.current) {
        clearInterval(rotateIntervalRef.current);
        rotateIntervalRef.current = null;
      }
    };
  }, []);

  const startRotateHold = (delta) => {
    if (rotateIntervalRef.current) clearInterval(rotateIntervalRef.current);
    setRotationY((v) => v + delta);
    rotateIntervalRef.current = setInterval(() => {
      setRotationY((v) => v + delta);
    }, 40);
  };

  const stopRotateHold = () => {
    if (rotateIntervalRef.current) {
      clearInterval(rotateIntervalRef.current);
      rotateIntervalRef.current = null;
    }
  };

  const updateDraggingPosition = (worldPoint) => {
    const id = draggingIdRef.current;
    const mesh = garmentMeshRef.current;
    if (!id || !mesh) return;
    const local = mesh.worldToLocal(worldPoint.clone());
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        return { ...el, position: [local.x, local.y, local.z] };
      })
    );
  };

  const updateDraggingFromPointerEvent = (e) => {
    const mesh = garmentMeshRef.current;
    if (!mesh || !draggingIdRef.current) return;
    // Use the same raycaster to find the hit point on the garment mesh.
    const hits = e.raycaster?.intersectObject?.(mesh, true) || [];
    if (!hits.length) return;
    updateDraggingPosition(hits[0].point);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.2, 6.0], fov: 22, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onPointerMissed={() => {
          draggingIdRef.current = null;
          setSelectedElementId(null);
        }}
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
            <group ref={stageRef}>
              {showGarment && (
                <>
                  {garmentType === 'hoodie' ? (
                    <Hoodie color={garmentColor} onMeshReady={setGarmentMesh} />
                  ) : (
                    <Shirt color={garmentColor} onMeshReady={setGarmentMesh} />
                  )}
                </>
              )}

              {/* Project overlays directly onto the garment mesh */}
              {garmentMesh &&
                elements.map((el) => {
                  if (el.type === 'text') {
                    return createPortal(
                      <TextDecal
                        key={el.id}
                        el={el}
                        selectedId={selectedElementId}
                        setSelectedId={setSelectedElementId}
                        draggingIdRef={draggingIdRef}
                        updateDraggingFromPointerEvent={updateDraggingFromPointerEvent}
                      />,
                      garmentMesh
                    );
                  }

                  if (el.type === 'image' && el.texture) {
                    const s = Array.isArray(el.scale) ? el.scale : [1, 1];
                    const sx = Math.max(0.05, s[0]);
                    const sy = Math.max(0.05, s[1]);
                    return createPortal(
                      <Decal
                        key={el.id}
                        position={el.position}
                        rotation={[0, 0, 0]}
                        scale={[0.6 * sx, 0.6 * sy, 0.6]}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          draggingIdRef.current = el.id;
                        }}
                        onPointerMove={(e) => {
                          e.stopPropagation();
                          updateDraggingFromPointerEvent(e);
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          draggingIdRef.current = null;
                        }}
                        onPointerLeave={() => {
                          draggingIdRef.current = null;
                        }}
                      >
                        <meshStandardMaterial
                          transparent
                          map={el.texture}
                          roughness={1}
                          metalness={0.0}
                          opacity={0.97}
                          blending={THREE.NormalBlending}
                          premultipliedAlpha
                          polygonOffset
                          polygonOffsetFactor={-4}
                          depthWrite={false}
                          alphaTest={0.05}
                        />
                      </Decal>,
                      garmentMesh
                    );
                  }
                  return null;
                })}
            </group>
          </Center>
        </CameraRig>
      </Canvas>

      {/* Inline text editing: click text on the garment, then type here */}
      {selectedElement?.type === 'text' && (
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 10,
            padding: 8,
            maxWidth: 340
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Edit text</div>
          <input
            value={String(selectedElement.text ?? '')}
            onChange={(e) => apiRef.current?.setSelectedText?.(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.15)',
              outline: 'none'
            }}
          />
        </div>
      )}

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
          <IconButton
            size="small"
            onMouseDown={() => startRotateHold(-0.06)}
            onMouseUp={stopRotateHold}
            onMouseLeave={stopRotateHold}
            onTouchStart={() => startRotateHold(-0.06)}
            onTouchEnd={stopRotateHold}
            onTouchCancel={stopRotateHold}
            onClick={() => setRotationY((v) => v - 0.2)}
          >
            <RotateLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate right">
          <IconButton
            size="small"
            onMouseDown={() => startRotateHold(0.06)}
            onMouseUp={stopRotateHold}
            onMouseLeave={stopRotateHold}
            onTouchStart={() => startRotateHold(0.06)}
            onTouchEnd={stopRotateHold}
            onTouchCancel={stopRotateHold}
            onClick={() => setRotationY((v) => v + 0.2)}
          >
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
        <Tooltip title="Scale down">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.scaleSelected?.(0.9)}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Scale up">
          <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.scaleSelected?.(1.1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </div>
  );
}

export default ThreeDesignCanvas;
