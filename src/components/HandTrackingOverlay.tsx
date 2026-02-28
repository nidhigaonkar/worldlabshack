import { useEffect, useRef } from 'react';
import type { HandControlState } from '../hooks/useHandTracking';

interface Props {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  isLoading: boolean;
  error: string | null;
  handStateRef: React.RefObject<HandControlState>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const GESTURE_LABELS: Record<HandControlState['gesture'], string> = {
  none: 'No gesture',
  open: 'Move',
  pointing: 'Look',
  pinch: 'Action',
  peace: 'Up / Down',
};

const GESTURE_COLORS: Record<HandControlState['gesture'], string> = {
  none: 'text-gray-400',
  open: 'text-green-400',
  pointing: 'text-blue-400',
  pinch: 'text-amber-400',
  peace: 'text-purple-400',
};

export function HandTrackingOverlay({
  enabled,
  setEnabled,
  isLoading,
  error,
  handStateRef,
  videoRef,
  canvasRef,
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const gestureDisplayRef = useRef<HTMLSpanElement>(null);
  const gestureUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    let running = true;

    function updateGestureDisplay() {
      if (!running) return;
      const el = gestureDisplayRef.current;
      if (el) {
        const state = handStateRef.current;
        const label = GESTURE_LABELS[state.gesture];
        const color = GESTURE_COLORS[state.gesture];
        el.textContent = state.active ? label : 'No hand';
        el.className = `text-xs font-medium tracking-wider ${state.active ? color : 'text-gray-500'}`;
      }
      gestureUpdateRef.current = requestAnimationFrame(updateGestureDisplay);
    }
    gestureUpdateRef.current = requestAnimationFrame(updateGestureDisplay);
    return () => {
      running = false;
      cancelAnimationFrame(gestureUpdateRef.current);
    };
  }, [enabled, handStateRef]);

  useEffect(() => {
    if (!enabled) return;
    const container = previewRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = 'scaleX(-1)';
    video.style.borderRadius = '0.75rem';
    container.appendChild(video);

    return () => {
      if (container.contains(video)) {
        container.removeChild(video);
      }
    };
  }, [enabled, videoRef, isLoading]);

  useEffect(() => {
    if (!enabled) return;
    const container = previewRef.current;
    const canvas = canvasRef.current;
    if (!container) return;

    if (!canvas) {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = 640;
      newCanvas.height = 480;
      newCanvas.style.position = 'absolute';
      newCanvas.style.top = '0';
      newCanvas.style.left = '0';
      newCanvas.style.width = '100%';
      newCanvas.style.height = '100%';
      newCanvas.style.transform = 'scaleX(-1)';
      newCanvas.style.borderRadius = '0.75rem';
      newCanvas.style.pointerEvents = 'none';
      (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = newCanvas;
      container.appendChild(newCanvas);
    }

    return () => {
      const c = canvasRef.current;
      if (c && container.contains(c)) {
        container.removeChild(c);
      }
    };
  }, [enabled, canvasRef, isLoading]);

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={() => setEnabled(!enabled)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border transition-all duration-200
          ${enabled
            ? 'bg-green-900/80 border-green-500/50 hover:bg-green-800/80'
            : 'bg-reverie-surface/80 border-reverie-border hover:border-reverie-accent'
          }
        `}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 text-xs tracking-wider">Loading hand tracking...</span>
          </>
        ) : (
          <>
            <svg className={`w-4 h-4 ${enabled ? 'text-green-400' : 'text-reverie-muted'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
            </svg>
            <span className={`text-xs tracking-wider ${enabled ? 'text-green-300' : 'text-reverie-muted'}`}>
              {enabled ? 'Hand Tracking ON' : 'Hand Tracking'}
            </span>
          </>
        )}
      </button>

      {/* Webcam preview + gesture indicator */}
      {enabled && !isLoading && (
        <div className="fixed bottom-20 left-6 z-50 flex flex-col gap-2">
          <div
            ref={previewRef}
            className="relative w-52 h-40 rounded-xl overflow-hidden border border-green-500/30 bg-black/80 shadow-lg"
          />
          <div className="flex items-center justify-between bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-lg px-3 py-1.5">
            <span className="text-reverie-muted text-[10px] uppercase tracking-wider">Gesture:</span>
            <span ref={gestureDisplayRef} className="text-xs font-medium text-gray-500">
              No hand
            </span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="fixed bottom-20 left-6 z-50 bg-red-900/80 backdrop-blur-sm border border-red-500/50 rounded-lg px-4 py-2 max-w-xs">
          <span className="text-red-300 text-xs">{error}</span>
        </div>
      )}

      {/* Gesture legend */}
      {enabled && !isLoading && (
        <div className="fixed bottom-20 left-64 z-50 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-xl px-4 py-3">
          <span className="text-reverie-muted text-[10px] uppercase tracking-wider block mb-2">Controls</span>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xs">Open hand</span>
              <span className="text-reverie-muted text-[10px]">Move around</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xs">Point finger</span>
              <span className="text-reverie-muted text-[10px]">Look around</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xs">Pinch</span>
              <span className="text-reverie-muted text-[10px]">Interact</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 text-xs">Peace sign</span>
              <span className="text-reverie-muted text-[10px]">Up / Down</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
