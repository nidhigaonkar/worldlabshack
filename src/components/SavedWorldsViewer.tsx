import { useState, useEffect } from 'react';
import { getSavedWorlds, type SavedWorld } from '../lib/worldlabs';
import { SplatViewer } from './SplatViewer';

interface Props {
  onClose: () => void;
}

async function downloadPanorama(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank');
  }
}

export function SavedWorldsViewer({ onClose }: Props) {
  const [worlds, setWorlds] = useState<SavedWorld[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewingInBrowser, setViewingInBrowser] = useState(false);

  useEffect(() => {
    setWorlds(getSavedWorlds());
  }, []);

  if (worlds.length === 0) {
    return (
      <div className="fixed inset-0 bg-reverie-black/95 z-50 flex flex-col items-center justify-center animate-fade-in">
        <p className="text-reverie-muted mb-6">No saved worlds yet</p>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-reverie-surface border border-reverie-border text-reverie-muted hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  const currentWorld = worlds[currentIndex];

  function goNext() {
    setCurrentIndex((i) => (i + 1) % worlds.length);
    setViewingInBrowser(false);
  }

  function goPrev() {
    setCurrentIndex((i) => (i - 1 + worlds.length) % worlds.length);
    setViewingInBrowser(false);
  }

  if (viewingInBrowser && currentWorld.splatUrl) {
    return (
      <div className="fixed inset-0 bg-reverie-black z-50">
        <SplatViewer splatUrl={currentWorld.splatUrl} showPortal={false} keys={[]} />
        <button
          onClick={() => setViewingInBrowser(false)}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-reverie-surface/90 backdrop-blur-sm border border-reverie-border text-white hover:border-reverie-accent transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Gallery
        </button>
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-reverie-surface/90 backdrop-blur-sm border border-reverie-border rounded-lg px-4 py-2">
          <p className="text-white text-sm text-center line-clamp-1 max-w-md">
            {currentWorld.prompt}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-reverie-black/95 z-50 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-reverie-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-reverie-muted hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="text-white font-medium tracking-wide">Saved Worlds</h2>
        </div>
        <p className="text-reverie-muted text-sm">
          {currentIndex + 1} of {worlds.length}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 gap-4">
        <button
          onClick={goPrev}
          className="p-3 rounded-full bg-reverie-surface border border-reverie-border text-reverie-muted hover:text-white hover:border-reverie-accent transition-all"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 max-w-3xl flex flex-col items-center gap-4">
          {currentWorld.thumbnailUrl && (
            <img
              src={currentWorld.thumbnailUrl}
              alt={currentWorld.prompt}
              className="w-full max-h-[50vh] object-contain rounded-xl border border-reverie-border"
            />
          )}
          
          <div className="text-center">
            <p className="text-white text-sm leading-relaxed mb-2">
              {currentWorld.prompt}
            </p>
            <p className="text-reverie-muted text-xs">
              {new Date(currentWorld.timestamp).toLocaleDateString()} at {new Date(currentWorld.timestamp).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {currentWorld.splatUrl && (
              <button
                onClick={() => setViewingInBrowser(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                </svg>
                View in Browser
              </button>
            )}
            <a
              href={currentWorld.marbleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-reverie-accent text-white text-sm hover:bg-reverie-glow transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Marble
            </a>
            {currentWorld.splatUrl && (
              <a
                href={currentWorld.splatUrl}
                download={`world-${currentIndex + 1}.spz`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-reverie-surface border border-reverie-border text-reverie-muted text-sm hover:text-white hover:border-reverie-accent transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Splat
              </a>
            )}
            {currentWorld.panoUrl && (
              <button
                onClick={() =>
                  downloadPanorama(
                    currentWorld.panoUrl!,
                    `world-${currentIndex + 1}-panorama.png`
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-reverie-surface border border-reverie-border text-reverie-muted text-sm hover:text-white hover:border-reverie-accent transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Download Panorama
              </button>
            )}
          </div>
        </div>

        <button
          onClick={goNext}
          className="p-3 rounded-full bg-reverie-surface border border-reverie-border text-reverie-muted hover:text-white hover:border-reverie-accent transition-all"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
