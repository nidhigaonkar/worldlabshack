import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import type { MemoryMedia } from '../types';
import type { HandControlState } from '../hooks/useHandTracking';

interface Props {
  splatUrl: string;
  memories: MemoryMedia[];
  handTrackingRef?: React.RefObject<HandControlState>;
}

export function MemorySplatViewer({ splatUrl, memories, handTrackingRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const memoriesRef = useRef(memories);

  console.log('[MemorySplatViewer] component mounted/updated, splatUrl:', splatUrl);

  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

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

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container!.clientWidth, container!.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container!.appendChild(renderer.domElement);

      const spark = new SparkRenderer({ renderer });
      scene.add(spark);

      console.log('[MemorySplatViewer] loading', splatUrl);
      const splatMesh = new SplatMesh({ url: splatUrl });
      await splatMesh.initialized;
      if (disposed) {
        splatMesh.dispose();
        renderer.dispose();
        return;
      }
      scene.add(splatMesh);
      console.log('[MemorySplatViewer] loaded');

      splatMesh.rotation.x = Math.PI;

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      // Create memory frames
      const memoryFrames: Map<string, THREE.Group> = new Map();

      function createMemoryFrame(memory: MemoryMedia): THREE.Group {
        const group = new THREE.Group();
        group.position.set(memory.position.x, memory.position.y, memory.position.z);
        group.rotation.set(memory.rotation.x, memory.rotation.y, memory.rotation.z);

        // Smaller frames that fit inside the world
        const frameWidth = 0.6;
        const frameHeight = 0.45;
        const frameDepth = 0.02;
        const borderWidth = 0.03;

        // Frame border (gold/wooden look)
        const frameMaterial = new THREE.MeshBasicMaterial({
          color: 0xd4a574,
          transparent: true,
          opacity: 0.95,
        });

        // Top border
        const topGeo = new THREE.BoxGeometry(frameWidth + borderWidth * 2, borderWidth, frameDepth);
        const topMesh = new THREE.Mesh(topGeo, frameMaterial);
        topMesh.position.y = frameHeight / 2 + borderWidth / 2;
        group.add(topMesh);

        // Bottom border
        const bottomMesh = new THREE.Mesh(topGeo, frameMaterial);
        bottomMesh.position.y = -frameHeight / 2 - borderWidth / 2;
        group.add(bottomMesh);

        // Left border
        const sideGeo = new THREE.BoxGeometry(borderWidth, frameHeight, frameDepth);
        const leftMesh = new THREE.Mesh(sideGeo, frameMaterial);
        leftMesh.position.x = -frameWidth / 2 - borderWidth / 2;
        group.add(leftMesh);

        // Right border
        const rightMesh = new THREE.Mesh(sideGeo, frameMaterial);
        rightMesh.position.x = frameWidth / 2 + borderWidth / 2;
        group.add(rightMesh);

        // Image plane
        const planeGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
        
        const img = new Image();
        img.src = memory.dataUrl;
        const texture = new THREE.Texture(img);
        img.onload = () => {
          texture.needsUpdate = true;
        };

        const planeMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
        planeMesh.name = 'memoryPlane';
        planeMesh.userData.memoryId = memory.id;
        group.add(planeMesh);

        // Subtle glow behind frame
        const glowGeo = new THREE.PlaneGeometry(frameWidth + 0.1, frameHeight + 0.1);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMaterial);
        glowMesh.position.z = -0.01;
        glowMesh.name = 'glow';
        group.add(glowMesh);

        // Point light for ambient glow
        const frameLight = new THREE.PointLight(0xffd700, 0.5, 2);
        frameLight.position.set(0, 0, 0.3);
        group.add(frameLight);

        return group;
      }

      // Position memories randomly spread throughout the world
      // Use seeded random based on index for consistent placement
      function seededRandom(seed: number) {
        const x = Math.sin(seed * 9999) * 10000;
        return x - Math.floor(x);
      }
      
      const positionedMemories = memoriesRef.current.map((mem, index) => {
        // Random angle anywhere in 360 degrees
        const angle = seededRandom(index * 7 + 1) * Math.PI * 2;
        
        // Random radius between 2 and 6 units from center
        const radius = 2 + seededRandom(index * 13 + 2) * 4;
        
        // Random height between -1 and 1.5
        const height = -1 + seededRandom(index * 17 + 3) * 2.5;
        
        // Calculate position
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        
        // Face toward center so user can see the frame
        const faceAngle = Math.atan2(-x, -z);
        
        return {
          ...mem,
          position: { x, y: height, z },
          rotation: { x: 0, y: faceAngle, z: 0 },
        };
      });

      positionedMemories.forEach(memory => {
        const frame = createMemoryFrame(memory);
        memoryFrames.set(memory.id, frame);
        scene.add(frame);
      });

      console.log(`[MemorySplatViewer] Added ${memoryFrames.size} memory frames at positions:`, 
        positionedMemories.map(m => m.position));

      // Camera controls
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let yaw = 0;
      let pitch = 0;
      const position = new THREE.Vector3(0, 0, 3);
      const moveSpeed = 0.05;
      const pressedKeys: Record<string, boolean> = {};

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
        prevX = e.clientX;
        prevY = e.clientY;
      }

      function onPointerMove(e: PointerEvent) {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        
        yaw += dx * 0.003;
        pitch -= dy * 0.003;
        pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
        prevX = e.clientX;
        prevY = e.clientY;
        updateCamera();
      }

      function onPointerUp() {
        isDragging = false;
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
      const basePositions = new Map<string, number>();
      
      // Store base Y positions for animation
      for (const [id, frame] of memoryFrames) {
        basePositions.set(id, frame.position.y);
      }
      
      function animate() {
        if (disposed) return;
        requestAnimationFrame(animate);
        time += 0.016;

        // Movement
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

        if (Object.values(pressedKeys).some(v => v)) {
          updateCamera();
        }

        // Hand tracking controls
        const handState = handTrackingRef?.current;
        if (handState?.active) {
          let handMoved = false;

          if (Math.abs(handState.moveX) > 0.01 || Math.abs(handState.moveZ) > 0.01) {
            position.addScaledVector(forward, moveSpeed * handState.moveZ);
            position.addScaledVector(right, moveSpeed * handState.moveX);
            handMoved = true;
          }

          if (Math.abs(handState.moveY) > 0.01) {
            position.y += moveSpeed * handState.moveY;
            handMoved = true;
          }

          if (Math.abs(handState.lookYawSpeed) > 0.001 || Math.abs(handState.lookPitchSpeed) > 0.001) {
            yaw += handState.lookYawSpeed;
            pitch += handState.lookPitchSpeed;
            pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
            handMoved = true;
          }

          if (handMoved) updateCamera();
        }

        // Animate memory frames - gentle float
        let i = 0;
        for (const [id, frame] of memoryFrames) {
          const baseY = basePositions.get(id) || 0;
          frame.position.y = baseY + Math.sin(time * 1.2 + i * 0.5) * 0.03;
          
          // Pulse glow
          const glow = frame.getObjectByName('glow') as THREE.Mesh;
          if (glow) {
            const mat = glow.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.15 + Math.sin(time * 2 + i) * 0.05;
          }
          i++;
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
        
        // Cleanup frames
        for (const [, frame] of memoryFrames) {
          frame.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
          });
        }
        memoryFrames.clear();
        
        renderer.dispose();
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }

    init().catch((err) => {
      console.error('[MemorySplatViewer] failed to load:', err);
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [splatUrl]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  );
}
