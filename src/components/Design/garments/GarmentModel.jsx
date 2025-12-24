import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

export default function GarmentModel({ modelPath, color, onStatus }) {
  const root = useRef();
  const { camera, size } = useThree();

  const fallbackMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 }),
    []
  );

  const materialsRef = useRef([fallbackMaterial]);
  const [model, setModel] = useState(null);
  const [modelScale, setModelScale] = useState(1);
  const [baseBounds, setBaseBounds] = useState({ x: 1.2, y: 1.4, z: 0.45 });
  const [loadState, setLoadState] = useState('loading'); // loading | loaded | failed

  const computeFitScale = (bounds) => {
    // Fit bounds into view based on current camera distance + fov.
    const d = Math.max(0.001, Math.abs(camera.position.z));
    const fovRad = (camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * d * Math.tan(fovRad / 2);
    const aspect = size.height > 0 ? size.width / size.height : 1;
    const visibleWidth = visibleHeight * aspect;

    // Leave some margin.
    const margin = 0.78;
    const sx = bounds.x > 0 ? (visibleWidth * margin) / bounds.x : 1;
    const sy = bounds.y > 0 ? (visibleHeight * margin) / bounds.y : 1;
    return clamp(Math.min(sx, sy), 0.01, 100);
  };

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();

    setLoadState('loading');
    onStatus?.({ state: 'loading', path: modelPath });

    loader.load(
      modelPath,
      (gltf) => {
        if (!mounted) return;

        const scene = gltf.scene || gltf.scenes?.[0];
        const coloredMaterials = [];

        scene?.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const cloned = child.material.clone();
            child.material = cloned;
            if (cloned.color) coloredMaterials.push(cloned);
          }
        });

        // Recenter model to origin so framing is stable.
        let boundsSize = new THREE.Vector3(1.2, 1.4, 0.45);
        try {
          scene?.updateMatrixWorld?.(true);
          const preBox = new THREE.Box3().setFromObject(scene);
          const preCenter = new THREE.Vector3();
          preBox.getCenter(preCenter);
          preBox.getSize(boundsSize);
          scene.position.sub(preCenter);
        } catch {
          // ignore
        }

        const base = { x: boundsSize.x || 1.2, y: boundsSize.y || 1.4, z: boundsSize.z || 0.45 };
        setBaseBounds(base);

        if (coloredMaterials.length > 0) {
          materialsRef.current = coloredMaterials;
          const initial = new THREE.Color(color);
          coloredMaterials.forEach((m) => m.color?.copy(initial));
        } else {
          materialsRef.current = [fallbackMaterial];
        }

        setModel(scene);
        setLoadState('loaded');
        onStatus?.({ state: 'loaded', path: modelPath });
      },
      undefined,
      (err) => {
        if (!mounted) return;
        setModel(null);
        setLoadState('failed');
        materialsRef.current = [fallbackMaterial];
        onStatus?.({ state: 'failed', path: modelPath, error: err });
      }
    );

    return () => {
      mounted = false;
    };
  }, [modelPath]);

  useEffect(() => {
    if (loadState !== 'loaded') return;
    const nextScale = computeFitScale(baseBounds);
    setModelScale(nextScale);
    onStatus?.({
      state: 'loaded',
      path: modelPath,
      bounds: { x: baseBounds.x * nextScale, y: baseBounds.y * nextScale, z: baseBounds.z * nextScale }
    });
  }, [loadState, baseBounds, camera.position.z, camera.fov, size.width, size.height, modelPath]);

  useFrame((_, delta) => {
    const target = new THREE.Color(color);
    materialsRef.current.forEach((mat) => {
      if (mat?.color) easing.dampC(mat.color, target, 0.25, delta);
    });
  });

  if (model && loadState === 'loaded') {
    return (
      <group ref={root} dispose={null} scale={modelScale}>
        <primitive object={model} />
      </group>
    );
  }

  // Fallback box if model is missing/failed.
  return (
    <group ref={root} dispose={null}>
      <mesh castShadow receiveShadow material={fallbackMaterial}>
        <boxGeometry args={[1.2, 1.4, 0.45]} />
      </mesh>
    </group>
  );
}
