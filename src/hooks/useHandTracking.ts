import { useRef, useState, useCallback, useEffect } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandControlState {
  active: boolean;
  moveX: number;       // -1 to 1 (negative=left, positive=right)
  moveZ: number;       // -1 to 1 (positive=forward, negative=backward)
  moveY: number;       // -1 to 1 (positive=up, negative=down)
  lookYawSpeed: number;
  lookPitchSpeed: number;
  pinching: boolean;
  pinchJustStarted: boolean;
  gesture: 'none' | 'open' | 'pointing' | 'pinch' | 'peace';
  palmPosition: { x: number; y: number } | null;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  peaceHoldProgress: number;  // 0 to 1, progress toward triggering portal
  peaceTriggered: boolean;    // true when peace hold completes
}

const INITIAL_STATE: HandControlState = {
  active: false,
  moveX: 0, moveZ: 0, moveY: 0,
  lookYawSpeed: 0, lookPitchSpeed: 0,
  pinching: false, pinchJustStarted: false,
  gesture: 'none',
  palmPosition: null,
  landmarks: null,
  peaceHoldProgress: 0,
  peaceTriggered: false,
};

const PEACE_HOLD_DURATION_MS = 1500;

const DEAD_ZONE_MIN = 0.30;
const DEAD_ZONE_MAX = 0.70;
const PINCH_THRESHOLD = 0.07;
const SMOOTHING_FRAMES = 6;
const LOOK_SPEED_MULTIPLIER = 0.06;
const MOVE_SPEED_MULTIPLIER = 1.5;
const GESTURE_MOVE_MULTIPLIER = 2.5;

function isFingerExtended(
  landmarks: Array<{ x: number; y: number; z: number }>,
  tipIdx: number,
  pipIdx: number,
): boolean {
  return landmarks[tipIdx].y < landmarks[pipIdx].y - 0.03;
}

function detectGesture(
  landmarks: Array<{ x: number; y: number; z: number }>,
): { gesture: HandControlState['gesture']; pinchDist: number } {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinchDist = Math.sqrt(
    (thumbTip.x - indexTip.x) ** 2 + (thumbTip.y - indexTip.y) ** 2,
  );

  if (pinchDist < PINCH_THRESHOLD) {
    return { gesture: 'pinch', pinchDist };
  }

  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);

  const extendedCount =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return { gesture: 'peace', pinchDist };
  }
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { gesture: 'pointing', pinchDist };
  }
  if (extendedCount >= 3) {
    return { gesture: 'open', pinchDist };
  }

  return { gesture: 'none', pinchDist };
}

function mapToMovement(value: number): number {
  if (value < DEAD_ZONE_MIN) {
    return -((DEAD_ZONE_MIN - value) / DEAD_ZONE_MIN) * MOVE_SPEED_MULTIPLIER;
  }
  if (value > DEAD_ZONE_MAX) {
    return ((value - DEAD_ZONE_MAX) / (1 - DEAD_ZONE_MAX)) * MOVE_SPEED_MULTIPLIER;
  }
  return 0;
}

export function useHandTracking() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handStateRef = useRef<HandControlState>({ ...INITIAL_STATE });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const wasPinchingRef = useRef(false);
  const peaceStartTimeRef = useRef<number | null>(null);

  const smoothingBuffer = useRef<{
    palmX: number[];
    palmY: number[];
    tipX: number[];
    tipY: number[];
  }>({ palmX: [], palmY: [], tipX: [], tipY: [] });

  const smoothValue = useCallback((buffer: number[], newVal: number): number => {
    buffer.push(newVal);
    if (buffer.length > SMOOTHING_FRAMES) buffer.shift();
    return buffer.reduce((a, b) => a + b, 0) / buffer.length;
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const canvas = canvasRef.current;

    if (!video || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const results = landmarker.detectForVideo(video, performance.now());
    const ctx = canvas?.getContext('2d');

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (results.landmarks && results.landmarks.length > 0) {
      const numHands = results.landmarks.length;
      const rawLandmarks = results.landmarks[0];
      const landmarks = rawLandmarks.map((l) => ({ x: l.x, y: l.y, z: l.z }));

      // Draw landmarks on overlay canvas (all hands)
      if (ctx && canvas) {
        for (const handLms of results.landmarks) {
          const lms = handLms.map((l) => ({ x: l.x, y: l.y, z: l.z }));
          drawLandmarks(ctx, lms, canvas.width, canvas.height);
        }
      }

      const wrist = landmarks[0];
      const palmX = smoothValue(smoothingBuffer.current.palmX, wrist.x);
      const palmY = smoothValue(smoothingBuffer.current.palmY, wrist.y);

      const indexTip = landmarks[8];
      const tipX = smoothValue(smoothingBuffer.current.tipX, indexTip.x);
      const tipY = smoothValue(smoothingBuffer.current.tipY, indexTip.y);

      const { gesture } = detectGesture(landmarks);

      // For 2 hands: check if second hand also has open gesture
      let bothHandsOpen = numHands === 2 && gesture === 'open';
      if (numHands === 2 && gesture === 'open') {
        const secondLandmarks = results.landmarks[1].map((l) => ({ x: l.x, y: l.y, z: l.z }));
        bothHandsOpen = detectGesture(secondLandmarks).gesture === 'open';
      }

      const state = handStateRef.current;
      state.active = true;
      state.landmarks = landmarks;
      state.palmPosition = { x: palmX, y: palmY };
      state.gesture = gesture;

      const wasPinching = wasPinchingRef.current;
      state.pinching = gesture === 'pinch';
      state.pinchJustStarted = state.pinching && !wasPinching;
      wasPinchingRef.current = state.pinching;

      if (gesture !== 'peace') {
        peaceStartTimeRef.current = null;
        state.peaceHoldProgress = 0;
        state.peaceTriggered = false;
      }

      switch (gesture) {
        case 'open': {
          state.moveX = 0;
          state.moveZ = (bothHandsOpen ? -1 : 1) * GESTURE_MOVE_MULTIPLIER;
          state.moveY = 0;
          state.lookYawSpeed = 0;
          state.lookPitchSpeed = 0;
          break;
        }
        case 'pointing': {
          state.moveX = 0;
          state.moveZ = 0;
          state.moveY = 0;
          state.lookYawSpeed = -mapToMovement(tipX) * LOOK_SPEED_MULTIPLIER;
          state.lookPitchSpeed = -mapToMovement(tipY) * LOOK_SPEED_MULTIPLIER;
          break;
        }
        case 'peace': {
          state.moveX = 0;
          state.moveZ = 0;
          state.moveY = 0;
          state.lookYawSpeed = 0;
          state.lookPitchSpeed = 0;
          
          const now = performance.now();
          if (peaceStartTimeRef.current === null) {
            peaceStartTimeRef.current = now;
            state.peaceTriggered = false;
          }
          const elapsed = now - peaceStartTimeRef.current;
          state.peaceHoldProgress = Math.min(elapsed / PEACE_HOLD_DURATION_MS, 1);
          
          if (state.peaceHoldProgress >= 1 && !state.peaceTriggered) {
            state.peaceTriggered = true;
          }
          break;
        }
        case 'pinch': {
          state.moveX = 0;
          state.moveZ = 0;
          state.moveY = 0;
          state.lookYawSpeed = -mapToMovement(palmX) * LOOK_SPEED_MULTIPLIER;
          state.lookPitchSpeed = -mapToMovement(palmY) * LOOK_SPEED_MULTIPLIER;
          break;
        }
        default: {
          state.moveX = 0;
          state.moveZ = 0;
          state.moveY = 0;
          state.lookYawSpeed = 0;
          state.lookPitchSpeed = 0;
        }
      }
    } else {
      const state = handStateRef.current;
      state.active = false;
      state.moveX = 0;
      state.moveZ = 0;
      state.moveY = 0;
      state.lookYawSpeed = 0;
      state.lookPitchSpeed = 0;
      state.pinching = false;
      state.pinchJustStarted = false;
      state.gesture = 'none';
      state.palmPosition = null;
      state.landmarks = null;
      state.peaceHoldProgress = 0;
      state.peaceTriggered = false;
      wasPinchingRef.current = false;
      peaceStartTimeRef.current = null;
      smoothingBuffer.current = { palmX: [], palmY: [], tipX: [], tipY: [] };
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [smoothValue]);

  const startTracking = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();
      videoRef.current = video;

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'GPU',
          },
          numHands: 2,
          runningMode: 'VIDEO',
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        landmarkerRef.current = handLandmarker;
      }

      setIsLoading(false);
      animFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('[HandTracking] Failed to start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start hand tracking');
      setIsLoading(false);
      setEnabled(false);
    }
  }, [processFrame]);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    handStateRef.current = { ...INITIAL_STATE };
    wasPinchingRef.current = false;
    peaceStartTimeRef.current = null;
    smoothingBuffer.current = { palmX: [], palmY: [], tipX: [], tipY: [] };
  }, []);

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [enabled, startTracking, stopTracking]);

  return {
    enabled,
    setEnabled,
    isLoading,
    error,
    handStateRef,
    videoRef,
    canvasRef,
  };
}

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z: number }>,
  w: number,
  h: number,
) {
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
  ctx.lineWidth = 2;
  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const isTip = [4, 8, 12, 16, 20].includes(i);
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, isTip ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? '#00ffaa' : 'rgba(0, 255, 170, 0.5)';
    ctx.fill();
  }
}
