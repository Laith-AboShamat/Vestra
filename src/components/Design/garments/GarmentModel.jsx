import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

export default function GarmentModel({ modelPath, color, onStatus, onMeshReady, onMeshesReady }) {
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

    // Guard against broken/near-zero bounds (can happen with some exports),
    // which would otherwise cause a huge scale and a "zoomed/cropped" view.
    const bx = Math.max(0.25, Number(bounds?.x) || 0);
    const by = Math.max(0.25, Number(bounds?.y) || 0);

    // Leave some margin.
    const margin = 0.78;
    const sx = (visibleWidth * margin) / bx;
    const sy = (visibleHeight * margin) / by;
    // Keep scale within a sensible range to avoid extreme zoom for oddly-authored assets.
    return clamp(Math.min(sx, sy), 0.01, 25);
  };

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();

    setLoadState('loading');
    onStatus?.({ state: 'loading', path: modelPath });

    loader.load(
      modelPath,
      async (gltf) => {
        if (!mounted) return;

        const scene = gltf.scene || gltf.scenes?.[0];
        const coloredMaterials = [];

        // Best-effort support for deprecated spec/gloss materials.
        // Some assets still export KHR_materials_pbrSpecularGlossiness. Newer Three versions
        // may warn "Unknown extension" and ignore its texture slots, making the model look wrong.
        const tryApplySpecGloss = async () => {
          const parser = gltf?.parser;
          const json = parser?.json;
          const materials = json?.materials;
          const associations = parser?.associations;
          if (!parser || !materials || !associations) return;

          const jobs = [];
          scene?.traverse((child) => {
            if (!child?.isMesh) return;
            const mat = child.material;
            const assoc = mat ? associations.get(mat) : null;
            const materialIndex = assoc?.materials ?? assoc?.material ?? null;
            if (materialIndex == null) return;
            const matDef = materials[materialIndex];
            const ext = matDef?.extensions?.KHR_materials_pbrSpecularGlossiness;
            if (!ext) return;

            // Ensure we have a Standard/Physical material to apply textures to.
            if (!child.material?.isMeshStandardMaterial && !child.material?.isMeshPhysicalMaterial) {
              const next = new THREE.MeshStandardMaterial();
              if (child.material?.color) next.color.copy(child.material.color);
              if (child.material?.map) next.map = child.material.map;
              if (child.material?.transparent) next.transparent = child.material.transparent;
              if (typeof child.material?.opacity === 'number') next.opacity = child.material.opacity;
              child.material?.dispose?.();
              child.material = next;
            }

            const targetMat = child.material;

            if (Array.isArray(ext.diffuseFactor) && ext.diffuseFactor.length >= 3) {
              targetMat.color = targetMat.color || new THREE.Color();
              targetMat.color.setRGB(ext.diffuseFactor[0], ext.diffuseFactor[1], ext.diffuseFactor[2]);
              if (typeof ext.diffuseFactor[3] === 'number') {
                targetMat.opacity = ext.diffuseFactor[3];
                targetMat.transparent = ext.diffuseFactor[3] < 1;
              }
            }

            if (typeof ext.glossinessFactor === 'number') {
              targetMat.metalness = 0;
              targetMat.roughness = clamp(1 - ext.glossinessFactor, 0, 1);
            }

            if (ext.diffuseTexture?.index != null) {
              jobs.push(
                parser.getDependency('texture', ext.diffuseTexture.index).then((tex) => {
                  targetMat.map = tex;
                  targetMat.needsUpdate = true;
                })
              );
            }

            // We can't perfectly translate specGloss textures to Standard PBR, but using the
            // specGloss texture as a roughness map usually looks better than ignoring it.
            if (ext.specularGlossinessTexture?.index != null) {
              jobs.push(
                parser.getDependency('texture', ext.specularGlossinessTexture.index).then((tex) => {
                  targetMat.roughnessMap = tex;
                  targetMat.needsUpdate = true;
                })
              );
            }
          });

          if (jobs.length > 0) {
            try {
              await Promise.all(jobs);
            } catch {
              // ignore
            }
          }
        };

        await tryApplySpecGloss();

        // Pick a "primary" mesh (largest bounds volume) for decal projection,
        // and also collect all meshes so decals can be placed on any side.
        let primaryMesh = null;
        let primaryVolume = -Infinity;
        const allMeshes = [];
        try {
          scene?.updateMatrixWorld?.(true);
          const box = new THREE.Box3();
          scene?.traverse((child) => {
            if (!child?.isMesh) return;
            allMeshes.push(child);
            box.setFromObject(child);
            const size = new THREE.Vector3();
            box.getSize(size);
            const vol = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
            if (Number.isFinite(vol) && vol > primaryVolume) {
              primaryVolume = vol;
              primaryMesh = child;
            }
          });
        } catch {
          // ignore
        }

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

        // Notify after model is set so refs are stable.
        // Note: this is best-effort; some assets may have no meshes.
        if (typeof onMeshReady === 'function') onMeshReady(primaryMesh);
        if (typeof onMeshesReady === 'function') onMeshesReady(allMeshes);
      },
      undefined,
      (err) => {
        if (!mounted) return;
        setModel(null);
        setLoadState('failed');
        materialsRef.current = [fallbackMaterial];
        onStatus?.({ state: 'failed', path: modelPath, error: err });

        if (typeof onMeshReady === 'function') onMeshReady(null);
        if (typeof onMeshesReady === 'function') onMeshesReady([]);
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
