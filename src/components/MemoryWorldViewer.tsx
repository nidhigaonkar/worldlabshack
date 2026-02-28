import { useState } from 'react';
import { MemorySplatViewer } from './MemorySplatViewer';
import { HandTrackingOverlay } from './HandTrackingOverlay';
import { useHandTracking } from '../hooks/useHandTracking';
import type { MemoryMedia } from '../types';

interface Props {
  splatUrl: string;
  thumbnailUrl?: string;
  marbleUrl: string;
  memories: MemoryMedia[];
  themes: string[];
  onPlaySound?: () => void;
  audioLoading?: boolean;
  audioPlaying?: boolean;
  onMuteToggle?: (muted: boolean) => void;
  muted?: boolean;
}

export function MemoryWorldViewer({
  splatUrl,
  thumbnailUrl,
  marbleUrl,
  memories,
  themes,
  onPlaySound,
  audioLoading = false,
  audioPlaying = false,
  onMuteToggle,
  muted = false,
}: Props) {
  const [showInstructions, setShowInstructions] = useState(true);
  const photoCount = memories.length;
  const handTracking = useHandTracking();

  // Auto-hide instructions after 5 seconds
  if (showInstructions && splatUrl) {
    setTimeout(() => setShowInstructions(false), 5000);
  }

  return (
    <div className="fixed inset-0 bg-reverie-black">
      {/* Splat/thumbnail/loading - absolute inset-0 ensures it fills viewport */}
      <div className="absolute inset-0">
        {splatUrl ? (
          <MemorySplatViewer
            splatUrl={splatUrl}
            memories={memories}
            handTrackingRef={handTracking.handStateRef}
          />
        ) : thumbnailUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full flex flex-col items-center gap-6">
            <img
              src={thumbnailUrl}
              alt="Generated memory world preview"
              className="w-full rounded-xl border border-reverie-border object-cover max-h-[50vh]"
            />
            <a
              href={marbleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium tracking-widest uppercase text-sm
                bg-reverie-accent text-white hover:bg-reverie-glow
                transition-all duration-200
              "
            >
              Open in Marble
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-reverie-muted">Loading memory world...</span>
          </div>
        )}
      </div>

      {/* Timeless HUD - Top Bar */}
      <div className="fixed top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* Title */}
        <div className="pointer-events-auto flex items-center gap-3 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2">
          <span className="text-2xl">🌟</span>
          <span className="text-white text-sm tracking-wider font-medium">
            Timeless
          </span>
        </div>
        
        {/* Memory Counter */}
        <div className="pointer-events-auto flex items-center gap-2 bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-xl px-5 py-2.5">
          <div className="flex flex-col items-center">
            <span className="text-amber-300 text-sm font-medium">
              {photoCount} memories
            </span>
            <span className="text-amber-300/60 text-[10px] uppercase tracking-wider">
              displayed in your world
            </span>
          </div>
        </div>

        {/* Themes */}
        <div className="pointer-events-auto flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2">
          <span className="text-reverie-muted text-xs">
            {themes.slice(0, 3).join(' • ')}
          </span>
        </div>
      </div>

      {/* Instructions toast */}
      {showInstructions && splatUrl && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none animate-fade-in">
          <div className="bg-reverie-surface/90 backdrop-blur-sm border border-amber-500/30 rounded-xl px-6 py-3">
            <p className="text-amber-300 text-sm text-center">
              Explore with <span className="font-medium">WASD</span> + mouse, or enable <span className="font-medium">hand tracking</span> below
            </p>
          </div>
        </div>
      )}

      {/* Play ambient sound - bottom right */}
      {onPlaySound && (
        <div className="fixed bottom-6 right-6">
          {audioLoading ? (
            <div className="flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-reverie-accent animate-pulse" />
              <span className="text-reverie-muted text-xs tracking-wider">Generating sound…</span>
            </div>
          ) : audioPlaying && onMuteToggle ? (
            <button
              onClick={() => onMuteToggle(!muted)}
              className="flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2 hover:bg-reverie-surface transition-colors"
            >
              {muted ? (
                <svg className="w-4 h-4 text-reverie-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-reverie-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
              <span className="text-reverie-muted text-xs">{muted ? 'Unmute' : 'Mute'}</span>
            </button>
          ) : (
            <button
              onClick={onPlaySound}
              className="flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2 hover:border-reverie-accent hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 text-reverie-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span className="text-reverie-muted text-xs tracking-wider">Play ambient sound</span>
            </button>
          )}
        </div>
      )}

      {/* Hand tracking toggle + overlay */}
      {splatUrl && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <HandTrackingOverlay
            enabled={handTracking.enabled}
            setEnabled={handTracking.setEnabled}
            isLoading={handTracking.isLoading}
            error={handTracking.error}
            handStateRef={handTracking.handStateRef}
            videoRef={handTracking.videoRef}
            canvasRef={handTracking.canvasRef}
          />
        </div>
      )}

      {/* Controls hint */}
      <div className={`fixed ${handTracking.enabled ? 'bottom-24' : 'bottom-6'} left-6 pointer-events-none transition-all duration-200`}>
        <div className="flex items-center gap-2 bg-reverie-surface/60 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2">
          <span className="text-reverie-muted text-[10px] tracking-wider uppercase">
            {handTracking.enabled
              ? 'Hand tracking active • Open hand: move • Point: look • Pinch: interact'
              : 'WASD to move • Mouse to look around • Scroll to zoom'}
          </span>
        </div>
      </div>
    </div>
  );
}
