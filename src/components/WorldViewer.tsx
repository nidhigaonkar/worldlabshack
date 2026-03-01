import { useState, useCallback, useRef, useEffect } from 'react';
import { SplatViewer } from './SplatViewer';
import { HandTrackingOverlay } from './HandTrackingOverlay';
import { useHandTracking } from '../hooks/useHandTracking';
import type { KeyData } from '../types';

interface Props {
  marbleUrl: string;
  thumbnailUrl?: string;
  splatUrl?: string;
  worldNumber?: number;
  maxWorlds?: number;
  onPortalEnter?: () => void;
  onPlaySound?: () => void;
  audioLoading?: boolean;
  audioPlaying?: boolean;
  onMuteToggle?: (muted: boolean) => void;
  muted?: boolean;
  keys: KeyData[];
  totalKeysCollected: number;
  keysRequiredToWin: number;
  onKeyCollect?: (keyId: string) => void;
  portalLocked: boolean;
}

export function WorldViewer({ 
  marbleUrl, 
  thumbnailUrl, 
  splatUrl, 
  worldNumber = 1,
  maxWorlds = 3,
  onPortalEnter,
  onPlaySound,
  audioLoading = false,
  audioPlaying = false,
  onMuteToggle,
  muted = false,
  keys,
  totalKeysCollected,
  keysRequiredToWin,
  onKeyCollect,
  portalLocked,
}: Props) {

  const isLastWorld = worldNumber >= maxWorlds;
  const [nearestKeyDistance, setNearestKeyDistance] = useState<number | null>(null);
  const [showKeyCollectAnimation, setShowKeyCollectAnimation] = useState(false);
  const [peaceProgress, setPeaceProgress] = useState(0);
  const handTracking = useHandTracking();
  const resetViewRef = useRef<(() => void) | null>(null);
  const peaceTriggeredRef = useRef(false);

  useEffect(() => {
    if (!handTracking.enabled) {
      setPeaceProgress(0);
      peaceTriggeredRef.current = false;
      return;
    }

    let animFrame: number;
    const checkPeaceState = () => {
      const state = handTracking.handStateRef.current;
      if (state) {
        setPeaceProgress(state.peaceHoldProgress);
        
        if (state.peaceTriggered && !peaceTriggeredRef.current && !portalLocked && onPortalEnter) {
          peaceTriggeredRef.current = true;
          onPortalEnter();
        }
        
        if (!state.peaceTriggered) {
          peaceTriggeredRef.current = false;
        }
      }
      animFrame = requestAnimationFrame(checkPeaceState);
    };
    
    animFrame = requestAnimationFrame(checkPeaceState);
    return () => cancelAnimationFrame(animFrame);
  }, [handTracking.enabled, handTracking.handStateRef, portalLocked, onPortalEnter]);
  
  const handleProximityUpdate = useCallback((distance: number | null, _direction: { x: number; y: number; z: number } | null) => {
    setNearestKeyDistance(distance);
  }, []);
  
  const handleKeyCollect = useCallback((keyId: string) => {
    setShowKeyCollectAnimation(true);
    setTimeout(() => setShowKeyCollectAnimation(false), 1000);
    onKeyCollect?.(keyId);
  }, [onKeyCollect]);
  
  const uncollectedKeys = keys.filter(k => !k.collected).length;
  const getProximityColor = () => {
    if (nearestKeyDistance === null) return 'text-reverie-muted';
    if (nearestKeyDistance < 2) return 'text-green-400';
    if (nearestKeyDistance < 4) return 'text-yellow-400';
    if (nearestKeyDistance < 6) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getProximityText = () => {
    if (nearestKeyDistance === null || uncollectedKeys === 0) return null;
    if (nearestKeyDistance < 2) return 'Very close!';
    if (nearestKeyDistance < 4) return 'Getting warmer...';
    if (nearestKeyDistance < 6) return 'Warm';
    return 'Cold';
  };

  return (
    <div className="fixed inset-0 bg-reverie-black">
      {splatUrl ? (
        <SplatViewer 
          splatUrl={splatUrl} 
          onPortalClick={onPortalEnter}
          showPortal={!!onPortalEnter}
          portalLocked={portalLocked}
          keys={keys}
          onKeyCollect={handleKeyCollect}
          onProximityUpdate={handleProximityUpdate}
          handTrackingRef={handTracking.handStateRef}
          resetViewRef={resetViewRef}
        />
      ) : thumbnailUrl ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full flex flex-col items-center gap-6">
            <img
              src={thumbnailUrl}
              alt="Generated world preview"
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
          <span className="text-reverie-muted">Loading world...</span>
        </div>
      )}

      {/* Key collection animation */}
      {showKeyCollectAnimation && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 animate-fade-in">
          <div className="text-6xl animate-bounce">🔑</div>
        </div>
      )}

      {/* Home / Reset view button */}
      {splatUrl && (
        <button
          onClick={() => resetViewRef.current?.()}
          className="fixed top-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border hover:border-reverie-accent hover:text-white transition-colors"
          aria-label="Reset view to home"
        >
          <svg className="w-5 h-5 text-reverie-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
      )}

      {/* Escape Room HUD - Top Bar */}
      <div className="fixed top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* World indicator */}
        <div className="pointer-events-auto flex items-center gap-3 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2">
          <span className="text-reverie-accent text-xs tracking-wider font-medium">
            Room {worldNumber} of {maxWorlds}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: maxWorlds }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < worldNumber ? 'bg-reverie-accent' : 'bg-reverie-border'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Key Counter - Center */}
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 bg-amber-900/80 backdrop-blur-sm border border-amber-600/50 rounded-xl px-5 py-2.5">
            <span className="text-2xl">🔑</span>
            <div className="flex flex-col">
              <span className="text-amber-400 text-lg font-bold tracking-wider">
                {totalKeysCollected} / {keysRequiredToWin}
              </span>
              <span className="text-amber-300/60 text-[10px] uppercase tracking-wider">
                Keys Collected
              </span>
            </div>
          </div>
          {uncollectedKeys > 0 && (
            <span className="text-amber-300/50 text-[10px]">
              {uncollectedKeys} key{uncollectedKeys > 1 ? 's' : ''} remaining in this room
            </span>
          )}
        </div>
        
        {/* Proximity Indicator */}
        <div className="pointer-events-auto">
          {uncollectedKeys > 0 && getProximityText() ? (
            <div className={`flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2 ${getProximityColor()}`}>
              <div className={`w-3 h-3 rounded-full ${nearestKeyDistance && nearestKeyDistance < 4 ? 'animate-pulse' : ''}`} 
                   style={{ backgroundColor: nearestKeyDistance && nearestKeyDistance < 2 ? '#4ade80' : 
                            nearestKeyDistance && nearestKeyDistance < 4 ? '#facc15' : 
                            nearestKeyDistance && nearestKeyDistance < 6 ? '#fb923c' : '#ef4444' }} />
              <span className="text-xs tracking-wider font-medium">
                {getProximityText()}
              </span>
            </div>
          ) : uncollectedKeys === 0 ? (
            <div className="flex items-center gap-2 bg-green-900/80 backdrop-blur-sm border border-green-600/50 rounded-full px-4 py-2">
              <span className="text-green-400 text-xs tracking-wider font-medium">
                All keys found!
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Play ambient sound - bottom right, only calls ElevenLabs when clicked */}
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

      {/* Peace sign portal indicator */}
      {handTracking.enabled && peaceProgress > 0 && !portalLocked && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(124, 109, 245, 0.2)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(124, 109, 245, 1)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${peaceProgress * 283} 283`}
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">✌️</span>
              </div>
            </div>
            <span className="text-purple-300 text-sm tracking-wider font-medium bg-reverie-surface/80 backdrop-blur-sm px-4 py-2 rounded-full">
              {peaceProgress < 1 ? 'Hold to enter portal...' : 'Entering!'}
            </span>
          </div>
        </div>
      )}

      {/* Portal hint - shown when splat viewer has interactive portal */}
      {splatUrl && onPortalEnter && (
        <div className={`fixed ${handTracking.enabled ? 'bottom-24' : 'bottom-6'} left-6 pointer-events-none transition-all duration-200`}>
          {portalLocked ? (
            <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm border border-gray-600/50 rounded-full px-4 py-2">
              <span className="text-xl">🔒</span>
              <span className="text-gray-400 text-xs tracking-wider">
                Portal locked - Collect all 3 keys to escape
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-reverie-surface/60 backdrop-blur-sm border border-purple-500/30 rounded-full px-4 py-2 animate-pulse">
              <span className="text-xl">🔓</span>
              <span className="text-purple-300 text-xs tracking-wider font-medium">
                {isLastWorld ? 'Portal unlocked! Click or hold peace sign to ESCAPE!' : 'Portal unlocked! Click or hold peace sign to enter next room'}
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
