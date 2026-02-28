import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import type { MemoryMedia } from '../types';

interface Props {
  splatUrl: string;
  memories: MemoryMedia[];
  onMemoryClick?: (memoryId: string) => void;
}

export function MemorySplatViewer({ splatUrl, memories, onMemoryClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const memoriesRef = useRef(memories);
  const activeVideoRef = useRef<{ id: string; video: HTMLVideoElement; mesh: THREE.Mesh } | null>(null);

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
      const memoryFrames: Map<string, { group: THREE.Group; isVideo: boolean; videoElement?: HTMLVideoElement }> = new Map();

      function createMemoryFrame(memory: MemoryMedia): THREE.Group {
        const group = new THREE.Group();
        group.position.set(memory.position.x, memory.position.y, memory.position.z);
        group.rotation.set(memory.rotation.x, memory.rotation.y, memory.rotation.z);

        const frameWidth = 1.2;
        const frameHeight = 0.9;
        const frameDepth = 0.05;
        const borderWidth = 0.06;

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

        // Image/video plane
        const planeGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
        
        let texture: THREE.Texture;
        let videoElement: HTMLVideoElement | undefined;

        if (memory.type === 'video') {
          videoElement = document.createElement('video');
          videoElement.src = memory.dataUrl;
          videoElement.loop = true;
          videoElement.muted = false;
          videoElement.playsInline = true;
          videoElement.crossOrigin = 'anonymous';
          
          // Use thumbnail initially
          if (memory.thumbnail) {
            const img = new Image();
            img.src = memory.thumbnail;
            texture = new THREE.Texture(img);
            img.onload = () => {
              texture.needsUpdate = true;
            };
          } else {
            texture = new THREE.VideoTexture(videoElement);
          }
        } else {
          const img = new Image();
          img.src = memory.dataUrl;
          texture = new THREE.Texture(img);
          img.onload = () => {
            texture.needsUpdate = true;
          };
        }

        const planeMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMaterial);
        planeMesh.name = 'memoryPlane';
        planeMesh.userData.memoryId = memory.id;
        group.add(planeMesh);

        // Glow effect for videos
        if (memory.type === 'video') {
          const glowGeo = new THREE.PlaneGeometry(frameWidth + 0.2, frameHeight + 0.2);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b5cf6,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
          });
          const glowMesh = new THREE.Mesh(glowGeo, glowMaterial);
          glowMesh.position.z = -0.02;
          glowMesh.name = 'glow';
          group.add(glowMesh);

          // Play icon overlay
          const playIconGeo = new THREE.CircleGeometry(0.15, 32);
          const playIconMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
          });
          const playIcon = new THREE.Mesh(playIconGeo, playIconMaterial);
          playIcon.position.z = 0.01;
          playIcon.name = 'playIcon';
          group.add(playIcon);
        }

        // Point light for ambient glow
        const frameLight = new THREE.PointLight(
          memory.type === 'video' ? 0x8b5cf6 : 0xffd700,
          1,
          3
        );
        frameLight.position.set(0, 0, 0.5);
        group.add(frameLight);

        return group;
      }

      // Position memories in a semicircle around the user
      const positionedMemories = memoriesRef.current.map((mem, index) => {
        const total = memoriesRef.current.length;
        const angleSpread = Math.PI * 0.8;
        const angle = -angleSpread / 2 + (angleSpread * index) / Math.max(total - 1, 1);
        const radius = 3;
        const heightVariation = (index % 2) * 0.3 - 0.15;
        
        return {
          ...mem,
          position: {
            x: Math.sin(angle) * radius,
            y: 0.5 + heightVariation,
            z: -Math.cos(angle) * radius,
          },
          rotation: {
            x: 0,
            y: angle + Math.PI,
            z: 0,
          },
        };
      });

      positionedMemories.forEach(memory => {
        const frame = createMemoryFrame(memory);
        memoryFrames.set(memory.id, {
          group: frame,
          isVideo: memory.type === 'video',
        });
        scene.add(frame);
      });

      console.log(`[MemorySplatViewer] Added ${memoryFrames.size} memory frames`);

      // Camera controls
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
          
          // Check for memory frame clicks
          const allFrameGroups = Array.from(memoryFrames.values()).map(f => f.group);
          const intersects = raycaster.intersectObjects(allFrameGroups, true);
          
          if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            const memoryId = clickedObject.userData.memoryId || 
                            clickedObject.parent?.children.find(c => c.userData.memoryId)?.userData.memoryId;
            
            if (memoryId) {
              handleMemoryClick(memoryId);
            }
          }
        }
        
        isDragging = false;
        wasClick = false;
      }

      function handleMemoryClick(memoryId: string) {
        const frameData = memoryFrames.get(memoryId);
        if (!frameData) return;

        const memory = positionedMemories.find(m => m.id === memoryId);
        if (!memory) return;

        console.log('[MemorySplatViewer] Memory clicked:', memoryId, memory.type);
        onMemoryClick?.(memoryId);

        if (memory.type === 'video') {
          // Toggle video playback
          if (activeVideoRef.current?.id === memoryId) {
            // Stop current video
            activeVideoRef.current.video.pause();
            activeVideoRef.current = null;
            
            // Restore thumbnail
            const plane = frameData.group.getObjectByName('memoryPlane') as THREE.Mesh;
            if (plane && memory.thumbnail) {
              const img = new Image();
              img.src = memory.thumbnail;
              const texture = new THREE.Texture(img);
              img.onload = () => {
                texture.needsUpdate = true;
                (plane.material as THREE.MeshBasicMaterial).map = texture;
                (plane.material as THREE.MeshBasicMaterial).needsUpdate = true;
              };
            }
            
            // Show play icon
            const playIcon = frameData.group.getObjectByName('playIcon');
            if (playIcon) playIcon.visible = true;
          } else {
            // Stop any existing video
            if (activeVideoRef.current) {
              activeVideoRef.current.video.pause();
              const prevFrame = memoryFrames.get(activeVideoRef.current.id);
              if (prevFrame) {
                const playIcon = prevFrame.group.getObjectByName('playIcon');
                if (playIcon) playIcon.visible = true;
              }
            }

            // Start new video
            const videoElement = document.createElement('video');
            videoElement.src = memory.dataUrl;
            videoElement.loop = true;
            videoElement.muted = false;
            videoElement.playsInline = true;
            
            const videoTexture = new THREE.VideoTexture(videoElement);
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            const plane = frameData.group.getObjectByName('memoryPlane') as THREE.Mesh;
            if (plane) {
              (plane.material as THREE.MeshBasicMaterial).map = videoTexture;
              (plane.material as THREE.MeshBasicMaterial).needsUpdate = true;
            }

            videoElement.play().catch(err => {
              console.warn('[MemorySplatViewer] Video play failed:', err);
            });

            activeVideoRef.current = {
              id: memoryId,
              video: videoElement,
              mesh: plane,
            };

            // Hide play icon
            const playIcon = frameData.group.getObjectByName('playIcon');
            if (playIcon) playIcon.visible = false;
          }
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

        // Animate memory frames
        for (const [, frameData] of memoryFrames) {
          // Subtle float animation
          frameData.group.position.y += Math.sin(time * 1.5) * 0.0005;
          
          // Pulse glow for videos
          if (frameData.isVideo) {
            const glow = frameData.group.getObjectByName('glow') as THREE.Mesh;
            if (glow) {
              const mat = glow.material as THREE.MeshBasicMaterial;
              mat.opacity = 0.2 + Math.sin(time * 2) * 0.1;
            }
          }
        }

        // Update video texture if playing
        if (activeVideoRef.current) {
          const videoTexture = (activeVideoRef.current.mesh.material as THREE.MeshBasicMaterial).map;
          if (videoTexture) {
            videoTexture.needsUpdate = true;
          }
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
        
        // Stop any playing video
        if (activeVideoRef.current) {
          activeVideoRef.current.video.pause();
          activeVideoRef.current.video.src = '';
        }
        
        splatMesh.dispose();
        
        // Cleanup frames
        for (const [, frameData] of memoryFrames) {
          frameData.group.traverse((obj) => {
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
  }, [splatUrl, onMemoryClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
}
