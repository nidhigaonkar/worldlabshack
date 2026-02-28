import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import type { KeyData } from '../types';

interface Props {
  splatUrl: string;
  onPortalClick?: () => void;
  showPortal?: boolean;
  portalLocked?: boolean;
  keys: KeyData[];
  onKeyCollect?: (keyId: string) => void;
  onProximityUpdate?: (nearestKeyDistance: number | null, nearestKeyDirection: { x: number; y: number; z: number } | null) => void;
}

const KEY_COLORS = {
  gold: 0xffd700,
  silver: 0xc0c0c0,
  bronze: 0xcd7f32,
};

export function SplatViewer({ 
  splatUrl, 
  onPortalClick, 
  showPortal = true, 
  portalLocked = true,
  keys,
  onKeyCollect,
  onProximityUpdate,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const keysRef = useRef(keys);
  const onKeyCollectRef = useRef(onKeyCollect);
  const onProximityUpdateRef = useRef(onProximityUpdate);
  const portalLockedRef = useRef(portalLocked);

  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  useEffect(() => {
    onKeyCollectRef.current = onKeyCollect;
  }, [onKeyCollect]);

  useEffect(() => {
    onProximityUpdateRef.current = onProximityUpdate;
  }, [onProximityUpdate]);

  useEffect(() => {
    portalLockedRef.current = portalLocked;
  }, [portalLocked]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    async function init() {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);

      const camera = new THREE.PerspectiveCamera(
        60,
        container!.clientWidth / container!.clientHeight,
        0.1,
        1000
      );

      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(container!.clientWidth, container!.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container!.appendChild(renderer.domElement);

      const spark = new SparkRenderer({ renderer });
      scene.add(spark);

      console.log('[SplatViewer] loading', splatUrl);
      const splatMesh = new SplatMesh({ url: splatUrl });
      await splatMesh.initialized;
      if (disposed) {
        splatMesh.dispose();
        renderer.dispose();
        return;
      }
      scene.add(splatMesh);
      console.log('[SplatViewer] loaded');

      splatMesh.rotation.x = Math.PI;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      // Create collectible keys in 3D space
      const keyMeshes: Map<string, THREE.Group> = new Map();
      const keyLights: Map<string, THREE.PointLight> = new Map();
      
      function createKeyMesh(keyData: KeyData): THREE.Group {
        const keyGroup = new THREE.Group();
        keyGroup.position.set(keyData.position.x, keyData.position.y, keyData.position.z);
        
        const color = KEY_COLORS[keyData.color];
        
        // Scale factor to make keys much bigger and more visible
        const scale = 2.5;
        
        // Key head (circle with hole) - larger
        const headOuterGeo = new THREE.TorusGeometry(0.15 * scale, 0.04 * scale, 16, 32);
        const headMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
        const headOuter = new THREE.Mesh(headOuterGeo, headMat);
        keyGroup.add(headOuter);
        
        // Inner glow sphere for visibility
        const glowGeo = new THREE.SphereGeometry(0.1 * scale, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
        const glowSphere = new THREE.Mesh(glowGeo, glowMat);
        keyGroup.add(glowSphere);
        
        // Key shaft - thicker
        const shaftGeo = new THREE.BoxGeometry(0.06 * scale, 0.25 * scale, 0.03 * scale);
        const shaftMesh = new THREE.Mesh(shaftGeo, headMat);
        shaftMesh.position.y = -0.22 * scale;
        keyGroup.add(shaftMesh);
        
        // Key teeth - bigger
        const tooth1Geo = new THREE.BoxGeometry(0.08 * scale, 0.05 * scale, 0.03 * scale);
        const tooth1 = new THREE.Mesh(tooth1Geo, headMat);
        tooth1.position.set(0.04 * scale, -0.30 * scale, 0);
        keyGroup.add(tooth1);
        
        const tooth2Geo = new THREE.BoxGeometry(0.06 * scale, 0.05 * scale, 0.03 * scale);
        const tooth2 = new THREE.Mesh(tooth2Geo, headMat);
        tooth2.position.set(0.03 * scale, -0.38 * scale, 0);
        keyGroup.add(tooth2);
        
        // Outer glow ring for extra visibility
        const ringGeo = new THREE.TorusGeometry(0.25 * scale, 0.02 * scale, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'outerRing';
        keyGroup.add(ring);
        
        // Bright glow light - much stronger
        const keyLight = new THREE.PointLight(color, 4, 8);
        keyLight.position.copy(keyGroup.position);
        scene.add(keyLight);
        keyLights.set(keyData.id, keyLight);
        
        return keyGroup;
      }

      // Initialize keys from props
      keysRef.current.forEach(keyData => {
        if (!keyData.collected) {
          const keyMesh = createKeyMesh(keyData);
          keyMeshes.set(keyData.id, keyMesh);
          scene.add(keyMesh);
        }
      });
      console.log(`[SplatViewer] Added ${keyMeshes.size} keys to scene`);

      // Create portal mesh
      let portal: THREE.Group | null = null;
      let portalLight: THREE.PointLight | null = null;
      let portalOuterMaterial: THREE.MeshBasicMaterial | null = null;
      let portalInnerMaterial: THREE.MeshBasicMaterial | null = null;
      let portalCenterMaterial: THREE.MeshBasicMaterial | null = null;

      if (showPortal) {
        portal = new THREE.Group();
        portal.position.set(0, 0, -3);

        // Outer ring - starts dim/locked
        const outerGeometry = new THREE.TorusGeometry(0.6, 0.08, 16, 64);
        portalOuterMaterial = new THREE.MeshBasicMaterial({
          color: portalLockedRef.current ? 0x4a4a4a : 0x8b5cf6,
          transparent: true,
          opacity: portalLockedRef.current ? 0.5 : 0.9,
        });
        const outerRing = new THREE.Mesh(outerGeometry, portalOuterMaterial);
        portal.add(outerRing);

        // Inner ring
        const innerGeometry = new THREE.TorusGeometry(0.45, 0.04, 16, 64);
        portalInnerMaterial = new THREE.MeshBasicMaterial({
          color: portalLockedRef.current ? 0x3a3a3a : 0x60a5fa,
          transparent: true,
          opacity: portalLockedRef.current ? 0.3 : 0.7,
        });
        const innerRing = new THREE.Mesh(innerGeometry, portalInnerMaterial);
        portal.add(innerRing);

        // Center glow (disc) - shows lock icon when locked
        const centerGeometry = new THREE.CircleGeometry(0.35, 32);
        portalCenterMaterial = new THREE.MeshBasicMaterial({
          color: portalLockedRef.current ? 0x2a2a2a : 0x1e1b4b,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const centerDisc = new THREE.Mesh(centerGeometry, portalCenterMaterial);
        portal.add(centerDisc);

        // Point light for glow effect
        portalLight = new THREE.PointLight(portalLockedRef.current ? 0x666666 : 0x8b5cf6, portalLockedRef.current ? 0.5 : 2, 5);
        portalLight.position.set(0, 0, -2.5);
        scene.add(portalLight);

        scene.add(portal);
        console.log('[SplatViewer] Portal added to scene (locked:', portalLockedRef.current, ')');
      }

      let isDragging = false;
      let wasClick = false;
      let clickStartTime = 0;
      let prevX = 0;
      let prevY = 0;
      let yaw = 0;
      let pitch = 0;
      const position = new THREE.Vector3(0, 0, 3);
      const moveSpeed = 0.05;
      const pressedKeys: Record<string, boolean> = {};
      const KEY_COLLECT_DISTANCE = 1.2;

      function updateCamera() {
        const direction = new THREE.Vector3();
        direction.x = Math.sin(yaw) * Math.cos(pitch);
        direction.y = Math.sin(pitch);
        direction.z = -Math.cos(yaw) * Math.cos(pitch);
        
        camera.position.copy(position);
        camera.lookAt(position.clone().add(direction));
      }
      updateCamera();

      function onPointerDown(e: PointerEvent) {
        isDragging = true;
        wasClick = true;
        clickStartTime = Date.now();
        prevX = e.clientX;
        prevY = e.clientY;
      }

      function onPointerMove(e: PointerEvent) {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        
        // If moved significantly, it's not a click
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          wasClick = false;
        }
        
        yaw += dx * 0.003;
        pitch -= dy * 0.003;
        pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
        prevX = e.clientX;
        prevY = e.clientY;
        updateCamera();
      }

      function onPointerUp(e: PointerEvent) {
        const clickDuration = Date.now() - clickStartTime;
        
        if (wasClick && clickDuration < 300) {
          mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          
          // Check for key clicks first
          const allKeyMeshes = Array.from(keyMeshes.values());
          if (allKeyMeshes.length > 0) {
            const keyIntersects = raycaster.intersectObjects(allKeyMeshes, true);
            if (keyIntersects.length > 0) {
              // Find which key was clicked
              for (const [keyId, keyMesh] of keyMeshes.entries()) {
                if (keyIntersects[0].object.parent === keyMesh || keyMesh.children.includes(keyIntersects[0].object)) {
                  const keyData = keysRef.current.find(k => k.id === keyId);
                  if (keyData && !keyData.collected) {
                    const dist = position.distanceTo(new THREE.Vector3(keyData.position.x, keyData.position.y, keyData.position.z));
                    if (dist <= KEY_COLLECT_DISTANCE * 2) {
                      console.log('[SplatViewer] Key clicked:', keyId);
                      collectKey(keyId);
                    }
                  }
                  break;
                }
              }
            }
          }
          
          // Check for portal click: only if unlocked
          if (portal && onPortalClick && !portalLockedRef.current) {
            const portalIntersects = raycaster.intersectObjects(portal.children, true);
            if (portalIntersects.length > 0) {
              console.log('[SplatViewer] Portal clicked!');
              onPortalClick();
            }
          }
        }
        
        isDragging = false;
        wasClick = false;
      }
      
      function collectKey(keyId: string) {
        const keyMesh = keyMeshes.get(keyId);
        if (keyMesh) {
          scene.remove(keyMesh);
          keyMesh.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
          });
          keyMeshes.delete(keyId);
          
          const light = keyLights.get(keyId);
          if (light) {
            scene.remove(light);
            light.dispose();
            keyLights.delete(keyId);
          }
          
          onKeyCollectRef.current?.(keyId);
        }
      }

      function onWheel(e: WheelEvent) {
        e.preventDefault();
        const forward = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          0,
          -Math.cos(yaw) * Math.cos(pitch)
        ).normalize();
        position.addScaledVector(forward, -e.deltaY * 0.01);
        updateCamera();
      }

      function onKeyDown(e: KeyboardEvent) {
        pressedKeys[e.key.toLowerCase()] = true;
      }

      function onKeyUp(e: KeyboardEvent) {
        pressedKeys[e.key.toLowerCase()] = false;
      }

      const canvas = renderer.domElement;
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointerleave', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      function onResize() {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
      window.addEventListener('resize', onResize);

      let time = 0;
      let lastProximityUpdate = 0;
      
      function animate() {
        if (disposed) return;
        requestAnimationFrame(animate);
        time += 0.016;

        const forward = new THREE.Vector3(
          Math.sin(yaw),
          0,
          -Math.cos(yaw)
        ).normalize();
        const right = new THREE.Vector3(
          Math.cos(yaw),
          0,
          Math.sin(yaw)
        ).normalize();

        if (pressedKeys['w']) position.addScaledVector(forward, moveSpeed);
        if (pressedKeys['s']) position.addScaledVector(forward, -moveSpeed);
        if (pressedKeys['a']) position.addScaledVector(right, -moveSpeed);
        if (pressedKeys['d']) position.addScaledVector(right, moveSpeed);
        if (pressedKeys[' '] || pressedKeys['e']) position.y += moveSpeed;
        if (pressedKeys['shift'] || pressedKeys['q']) position.y -= moveSpeed;

        if (pressedKeys['w'] || pressedKeys['s'] || pressedKeys['a'] || pressedKeys['d'] || pressedKeys[' '] || pressedKeys['e'] || pressedKeys['shift'] || pressedKeys['q']) {
          updateCamera();
        }

        // Check for key proximity and auto-collect
        let nearestKeyDist: number | null = null;
        let nearestKeyDir: { x: number; y: number; z: number } | null = null;
        
        for (const keyId of keyMeshes.keys()) {
          const keyData = keysRef.current.find(k => k.id === keyId);
          if (keyData && !keyData.collected) {
            const keyPos = new THREE.Vector3(keyData.position.x, keyData.position.y, keyData.position.z);
            const dist = position.distanceTo(keyPos);
            
            // Auto-collect when very close
            if (dist <= KEY_COLLECT_DISTANCE) {
              collectKey(keyId);
              continue;
            }
            
            // Track nearest uncollected key for proximity hint
            if (nearestKeyDist === null || dist < nearestKeyDist) {
              nearestKeyDist = dist;
              const dir = keyPos.clone().sub(position).normalize();
              nearestKeyDir = { x: dir.x, y: dir.y, z: dir.z };
            }
          }
        }
        
        // Update proximity every 200ms to avoid too many updates
        if (time - lastProximityUpdate > 0.2) {
          lastProximityUpdate = time;
          onProximityUpdateRef.current?.(nearestKeyDist, nearestKeyDir);
        }

        // Store base Y for floating animation (do this first)
        for (const keyMesh of keyMeshes.values()) {
          if (keyMesh.userData.baseY === undefined) {
            keyMesh.userData.baseY = keyMesh.position.y;
          }
        }
        
        // Animate keys (float, spin, and pulse)
        for (const keyMesh of keyMeshes.values()) {
          // Spin the key
          keyMesh.rotation.y = time * 2.0;
          // Bob up and down
          keyMesh.position.y = keyMesh.userData.baseY + Math.sin(time * 3 + keyMesh.position.x) * 0.15;
          
          // Pulse the outer ring
          const outerRing = keyMesh.getObjectByName('outerRing');
          if (outerRing) {
            const pulse = 1 + Math.sin(time * 4) * 0.2;
            outerRing.scale.set(pulse, pulse, 1);
          }
        }
        
        // Pulse the key lights for extra visibility
        for (const keyLight of keyLights.values()) {
          keyLight.intensity = 4 + Math.sin(time * 5) * 2;
        }

        // Animate portal
        if (portal) {
          // Update portal appearance based on lock state
          if (portalOuterMaterial && portalInnerMaterial && portalCenterMaterial && portalLight) {
            if (portalLockedRef.current) {
              portalOuterMaterial.color.setHex(0x4a4a4a);
              portalOuterMaterial.opacity = 0.5;
              portalInnerMaterial.color.setHex(0x3a3a3a);
              portalInnerMaterial.opacity = 0.3;
              portalCenterMaterial.color.setHex(0x2a2a2a);
              portalLight.color.setHex(0x666666);
              portalLight.intensity = 0.5;
            } else {
              portalOuterMaterial.color.setHex(0x8b5cf6);
              portalOuterMaterial.opacity = 0.9;
              portalInnerMaterial.color.setHex(0x60a5fa);
              portalInnerMaterial.opacity = 0.7;
              portalCenterMaterial.color.setHex(0x1e1b4b);
              portalLight.color.setHex(0x8b5cf6);
              portalLight.intensity = 2;
            }
          }
          
          // Slow rotation (faster when unlocked)
          const rotSpeed = portalLockedRef.current ? 0.1 : 0.3;
          portal.rotation.z = time * rotSpeed;
          
          // Make inner ring spin opposite direction
          const innerRing = portal.children[1];
          if (innerRing) {
            innerRing.rotation.z = -time * (portalLockedRef.current ? 0.15 : 0.5);
          }
          
          // Pulsing scale effect (more subtle when locked)
          const pulseAmount = portalLockedRef.current ? 0.02 : 0.05;
          const pulse = 1 + Math.sin(time * 2) * pulseAmount;
          portal.scale.set(pulse, pulse, 1);
          
          // Keep portal facing the camera
          portal.lookAt(camera.position);
        }

        renderer.render(scene, camera);
      }
      animate();

      cleanupRef.current = () => {
        disposed = true;
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        splatMesh.dispose();
        
        // Cleanup keys
        for (const keyMesh of keyMeshes.values()) {
          keyMesh.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
          });
        }
        keyMeshes.clear();
        
        for (const light of keyLights.values()) {
          light.dispose();
        }
        keyLights.clear();
        
        if (portal) {
          portal.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
          });
        }
        if (portalLight) {
          portalLight.dispose();
        }
        renderer.dispose();
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    init().catch((err) => {
      console.error('[SplatViewer] failed to load:', err);
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [splatUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
