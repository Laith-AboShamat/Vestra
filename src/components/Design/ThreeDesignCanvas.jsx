import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame } from '@react-three/fiber';
import {
  Environment,
  Center,
  Decal,
  Html
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

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hexToRgb(hex) {
  const raw = String(hex || '').trim();
  const m = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = m[1];
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear01(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }) {
  const R = srgbToLinear01(r);
  const G = srgbToLinear01(g);
  const B = srgbToLinear01(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function pickOutlineColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 'rgba(0,0,0,0.35)';
  const lum = relativeLuminance(rgb);
  return lum > 0.6 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
}

function createTextTexture(text, options = {}) {
  const { color = '#111111' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 120px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const content = String(text ?? 'Text').slice(0, 18);
  // "Screen print" look: ink with soft edge + subtle grain.
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  // Thin outline to stay readable on similar garment colors.
  ctx.lineWidth = 10;
  ctx.strokeStyle = pickOutlineColor(color);
  ctx.strokeText(content, canvas.width / 2, canvas.height / 2);
  ctx.fillText(content, canvas.width / 2, canvas.height / 2);

  // Add subtle ink grain over the text (keeps the chosen color).
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 1 + Math.random() * 2;
    const h = 1 + Math.random() * 2;
    const dark = Math.random() < 0.5;
    const a = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
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

function createSelectionBoxTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padX = 70;
  const padY = 55;
  const w = canvas.width - padX * 2;
  const h = canvas.height - padY * 2;

  ctx.lineWidth = 10;
  ctx.setLineDash([18, 12]);
  // Two-pass stroke (white then black) to be readable on any garment.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeRect(padX, padY, w, h);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeRect(padX, padY, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function normalToEuler(normalArr) {
  const n = new THREE.Vector3(...(normalArr || [0, 0, 1]));
  if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
  n.normalize();
  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const e = new THREE.Euler();
  e.setFromQuaternion(quat);
  return [e.x, e.y, e.z];
}

function TextDecal({ el, selectedId, setSelectedId, draggingIdRef, updateDraggingFromPointerEvent, targetMesh }) {
  const tex = useMemo(() => createTextTexture(el.text, { color: el.color || '#111111' }), [el.text, el.color]);
  const boxTex = useMemo(() => createSelectionBoxTexture(), []);

  useEffect(() => {
    return () => {
      tex?.dispose?.();
      boxTex?.dispose?.();
    };
  }, [tex, boxTex]);

  useEffect(() => {
    console.log('[TEXT_DECAL]', { id: el.id, text: el.text, pos: el.position, meshId: el.meshId, targetMesh: !!targetMesh });
  }, [el, targetMesh]);

  const s = typeof el.scale === 'number' ? el.scale : 1;
  const rotation = useMemo(() => normalToEuler(el.normal || [0, 0, 1]), [el.normal]);

  if (!targetMesh || !targetMesh.isMesh) return null;
  const isSelected = selectedId === el.id;

  const selectionPlanePos = useMemo(() => {
    const p = new THREE.Vector3(...(el.position || [0, 0, 0]));
    const n = new THREE.Vector3(...(el.normal || [0, 0, 1]));
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
    n.normalize();
    // Lift a bit off the surface to avoid z-fighting.
    p.add(n.multiplyScalar(0.018));
    return [p.x, p.y, p.z];
  }, [el.position, el.normal]);

  return createPortal(
    <>
      {isSelected && (
        <mesh
          position={selectionPlanePos}
          rotation={rotation}
          frustumCulled={false}
          renderOrder={50}
          raycast={() => null}
        >
          <planeGeometry args={[0.86 * s, 0.28 * s]} />
          <meshBasicMaterial
            transparent
            map={boxTex}
            opacity={0.96}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
            alphaTest={0.02}
          />
        </mesh>
      )}

      <Decal
        position={el.position}
        rotation={rotation}
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
          opacity={0.98}
          blending={THREE.NormalBlending}
          premultipliedAlpha
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-4}
          depthWrite={false}
          alphaTest={0.02}
        />
      </Decal>
    </>,
    targetMesh
  );
}

function ImageDecal({ el, setSelectedId, draggingIdRef, updateDraggingFromPointerEvent, targetMesh }) {
  if (!targetMesh || !targetMesh.isMesh) return null;
  if (el.type !== 'image' || !el.texture) return null;

  const s = Array.isArray(el.scale) ? el.scale : [1, 1];
  const sx = Math.max(0.05, s[0]);
  const sy = Math.max(0.05, s[1]);
  const rotation = normalToEuler(el.normal || [0, 0, 1]);

  return createPortal(
    <Decal
      position={el.position}
      rotation={rotation}
      scale={[0.6 * sx, 0.6 * sy, 0.6]}
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
        map={el.texture}
        roughness={1}
        metalness={0.0}
        opacity={0.97}
        blending={THREE.NormalBlending}
        premultipliedAlpha
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-4}
        depthWrite={false}
        alphaTest={0.05}
      />
    </Decal>,
    targetMesh
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
  const [garmentMeshes, setGarmentMeshes] = useState([]);
  const garmentMeshesRef = useRef([]);

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

  const renderElements = useMemo(() => {
    const seen = new Set();
    return elements.filter((el) => {
      if (!el?.id) return false;
      if (seen.has(el.id)) return false;
      seen.add(el.id);
      return true;
    });
  }, [elements]);

  useEffect(() => {
    garmentMeshRef.current = garmentMesh && garmentMesh.isMesh ? garmentMesh : null;
  }, [garmentMesh]);

  useEffect(() => {
    garmentMeshesRef.current = (garmentMeshes || []).filter((m) => m?.isMesh);
  }, [garmentMeshes]);

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
        let normal = [0, 0, 1];
        let meshId = mesh?.uuid || null;
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
              normal = [0, 0, 1];
            }
          } catch {
            // ignore
          }
        }

        const id = makeId();
        setElements((prev) => [
          ...prev,
          {
            id,
            type: 'text',
            text,
            color: '#111111',
            position,
            normal,
            meshId,
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
          const id = makeId();
          setElements((prev) => [
            ...prev,
            {
              id,
              type: 'image',
              texture: tex,
              position: [0, 0.35, 0.25],
              normal: [0, 0, 1],
              meshId: garmentMeshRef.current?.uuid || null,
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
      setSelectedTextColor: (color) => {
        const id = selectedElementIdRef.current;
        if (!id) return;
        const nextColor = String(color ?? '').trim();
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== id) return el;
            if (el.type !== 'text') return el;
            return { ...el, color: nextColor || '#111111' };
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
            .map((e) => ({ id: e.id, type: e.type, text: e.text, color: e.color, position: e.position }))
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
    const meshes = garmentMeshesRef.current;
    if (!meshes.length || !draggingIdRef.current) return;
    // Use the same raycaster to find the hit point on any garment mesh.
    const hits = e.raycaster?.intersectObjects?.(meshes, true) || [];
    if (!hits.length) return;
    const hit = hits[0];
    const mesh = hit.object;
    const point = hit.point.clone();
    // Store the normal in *mesh-local* space, since decals are rendered as children of the mesh.
    const normal = hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
    normal.normalize();

    // convert hit point to mesh local coords
    const localPoint = mesh.worldToLocal(point.clone());

    const id = draggingIdRef.current;
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        return {
          ...el,
          position: [localPoint.x, localPoint.y, localPoint.z],
          normal: [normal.x, normal.y, normal.z],
          meshId: mesh.uuid
        };
      })
    );
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 0.2, 6.0], fov: 22, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onPointerMove={(e) => {
          if (!draggingIdRef.current) return;
          updateDraggingFromPointerEvent(e);
        }}
        onPointerUp={() => {
          draggingIdRef.current = null;
        }}
        onPointerLeave={() => {
          draggingIdRef.current = null;
        }}
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
                    <Hoodie
                      color={garmentColor}
                      onMeshReady={setGarmentMesh}
                      onMeshesReady={setGarmentMeshes}
                    />
                  ) : (
                    <Shirt
                      color={garmentColor}
                      onMeshReady={setGarmentMesh}
                      onMeshesReady={setGarmentMeshes}
                    />
                  )}
                </>
              )}

              {/* Project overlays directly onto the garment mesh */}
              {garmentMesh &&
                renderElements.map((el) => {
                  const targetMesh = garmentMeshesRef.current.find((m) => m.uuid === el.meshId) || garmentMesh || garmentMeshesRef.current[0];
                  if (!targetMesh || !targetMesh.isMesh) {
                    console.warn('[DECAL_SKIP_NO_MESH]', { id: el.id, meshId: el.meshId, targetMeshExists: !!targetMesh });
                    return null;
                  }

                  if (el.type === 'text') {
                    return (
                      <TextDecal
                        key={`text-${el.id}`}
                        el={el}
                        selectedId={selectedElementId}
                        setSelectedId={setSelectedElementId}
                        draggingIdRef={draggingIdRef}
                        updateDraggingFromPointerEvent={updateDraggingFromPointerEvent}
                        targetMesh={targetMesh}
                      />
                    );
                  }

                  if (el.type === 'image' && el.texture) {
                    return (
                      <ImageDecal
                        key={`img-${el.id}`}
                        el={el}
                        setSelectedId={setSelectedElementId}
                        draggingIdRef={draggingIdRef}
                        updateDraggingFromPointerEvent={updateDraggingFromPointerEvent}
                        targetMesh={targetMesh}
                      />
                    );
                  }
                  return null;
                })}

              {/* Inline text editing: anchored where you clicked, inside Canvas */}
              {selectedElement?.type === 'text' && garmentMesh && (() => {
                const editorMesh = garmentMeshesRef.current.find((m) => m.uuid === selectedElement.meshId) || garmentMesh || garmentMeshesRef.current[0];
                if (!editorMesh || !editorMesh.isMesh) return null;

                const localPos = new THREE.Vector3(...(selectedElement.position || [0, 0, 0]));
                const localNormal = new THREE.Vector3(...(selectedElement.normal || [0, 0, 1]));
                if (localNormal.lengthSq() < 1e-6) localNormal.set(0, 0, 1);
                localNormal.normalize();
                // Pull the editor slightly off the surface so it remains visible/clickable.
                localPos.add(localNormal.multiplyScalar(0.08));

                return createPortal(
                  <Html
                    position={[localPos.x, localPos.y, localPos.z]}
                    transform
                    wrapperClass="vestra-inline-editor"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        borderRadius: 12,
                        padding: '6px 8px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.16)',
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center'
                      }}
                    >
                      <input
                        autoFocus
                        value={String(selectedElement.text ?? '')}
                        onChange={(e) => apiRef.current?.setSelectedText?.(e.target.value)}
                        style={{
                          minWidth: 120,
                          maxWidth: 220,
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.18)',
                          outline: 'none',
                          fontWeight: 700
                        }}
                      />
                      <input
                        type="color"
                        aria-label="Text color"
                        value={String(selectedElement.color ?? '#111111')}
                        onChange={(e) => apiRef.current?.setSelectedTextColor?.(e.target.value)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          border: '1px solid rgba(0,0,0,0.18)',
                          padding: 0
                        }}
                      />
                    </div>
                  </Html>,
                  editorMesh
                );
              })()}
            </group>
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
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0, 0.06)}>
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0, -0.06)}>
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move left">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(-0.06, 0)}>
              <KeyboardArrowLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move right">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.moveSelected?.(0.06, 0)}>
              <KeyboardArrowRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete selected">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.deleteSelected?.()}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Scale down">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.scaleSelected?.(0.9)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Scale up">
          <span>
            <IconButton size="small" disabled={!selectedElement} onClick={() => apiRef.current?.scaleSelected?.(1.1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </div>
  );
}

export default ThreeDesignCanvas;
