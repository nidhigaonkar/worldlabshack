import { useCallback, useRef, useState } from 'react';
import type { MemoryMedia, MemoryAppState, MemoryLaneState } from '../types';
import { selectSceneImages, getSoundPrompt } from '../lib/openai';
import { generateWorldFromImages, pollOperation } from '../lib/worldlabs';
import { generateSoundEffect, startAudioLoop, unlockAudio, type AudioEngine } from '../lib/elevenlabs';
import { MemoryUploader, type UploadedMedia } from './MemoryUploader';
import { MemoryWorldViewer } from './MemoryWorldViewer';
import { LoadingState } from './LoadingState';

export function MemoryLaneApp() {
  const [state, setState] = useState<MemoryAppState>({ phase: 'uploading' });
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  function stopAudio() {
    audioEngineRef.current?.stop();
    audioEngineRef.current = null;
    setAudioPlaying(false);
  }

  const handleMediaUploaded = useCallback(async (uploads: UploadedMedia[]) => {
    stopAudio();
    setError(null);
    setPollAttempt(0);

    // Convert to MemoryMedia with placeholder positions
    const media: MemoryMedia[] = uploads.map(u => ({
      id: u.id,
      type: 'image' as const,
      dataUrl: u.dataUrl,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    }));

    setState({ phase: 'analyzing', media });

    try {
      // Get only images for scene selection
      const images = uploads
        .filter(u => u.type === 'image')
        .map(u => ({ dataUrl: u.dataUrl, filename: u.file.name }));

      if (images.length === 0) {
        throw new Error('Please upload at least one photo (not just videos)');
      }

      // Analyze images with OpenAI Vision
      const selectionResult = await selectSceneImages(images);
      
      const memoryState: MemoryLaneState = {
        uploadedMedia: media,
        selectedSceneIndices: selectionResult.selectedIndices,
        themes: selectionResult.themes,
        worldPrompt: selectionResult.worldPrompt,
      };

      const prompt = selectionResult.worldPrompt;
      setState({ phase: 'generating', memoryState, prompt });

      // Get the selected images' data URLs
      const selectedImageDataUrls = selectionResult.selectedIndices
        .map(i => images[i]?.dataUrl)
        .filter((url): url is string => !!url);

      // Generate world with images
      const operationId = await generateWorldFromImages(
        selectedImageDataUrls,
        prompt
      );

      setState({ phase: 'polling', memoryState, prompt, operationId });

      const result = await pollOperation(operationId, (attempt) => {
        setPollAttempt(attempt);
      }, prompt);

      console.log('[MemoryLaneApp] pollOperation completed, result:', result);
      console.log('[MemoryLaneApp] splatUrl:', result.splatUrl);
      console.log('[MemoryLaneApp] transitioning to displaying phase...');

      setState({
        phase: 'displaying',
        memoryState,
        marbleUrl: result.marbleUrl,
        caption: result.caption,
        thumbnailUrl: result.thumbnailUrl,
        splatUrl: result.splatUrl,
        panoUrl: result.panoUrl,
      });
      
      console.log('[MemoryLaneApp] setState called, should now show viewer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setState({ phase: 'uploading' });
    }
  }, []);

  const handlePlaySound = useCallback(async () => {
    if (state.phase !== 'displaying') return;
    const { caption } = state;
    const { themes } = state.memoryState;
    
    stopAudio();
    unlockAudio();
    setAudioLoading(true);
    setAudioPlaying(false);
    
    try {
      const themeText = themes.join(', ');
      const soundPrompt = await getSoundPrompt(
        `A nostalgic memory space with themes of ${themeText}. ${caption || ''}`
      );
      const audioData = await generateSoundEffect(soundPrompt);
      const engine = await startAudioLoop(audioData);
      audioEngineRef.current = engine;
      setAudioPlaying(true);
      setMuted(false);
    } catch (err) {
      console.warn('[Audio] Failed:', err);
    } finally {
      setAudioLoading(false);
    }
  }, [state]);

  const handleMuteToggle = useCallback((m: boolean) => {
    setMuted(m);
    audioEngineRef.current?.setMuted(m);
  }, []);

  const handleRestart = useCallback(() => {
    stopAudio();
    setError(null);
    setState({ phase: 'uploading' });
  }, []);

  function handleDismissError() {
    setError(null);
  }

  const showUploader = state.phase === 'uploading';
  const showAnalyzing = state.phase === 'analyzing';
  const showLoading = state.phase === 'generating' || state.phase === 'polling';
  const showViewer = state.phase === 'displaying';

  console.log('[MemoryLaneApp] render, phase:', state.phase, 'showViewer:', showViewer);
  if (showViewer && state.phase === 'displaying') {
    console.log('[MemoryLaneApp] viewer should render with splatUrl:', state.splatUrl);
  }

  return (
    <>
      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-fade-in">
          <div className="bg-red-950/90 border border-red-800 rounded-xl px-5 py-4 flex items-start gap-3 shadow-xl backdrop-blur-sm">
            <span className="text-red-400 flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <p className="text-red-200 text-sm flex-1">{error}</p>
            <button
              onClick={handleDismissError}
              className="text-red-400 hover:text-red-200 flex-shrink-0 transition-colors"
              aria-label="Dismiss error"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {showUploader && (
        <MemoryUploader onComplete={handleMediaUploaded} />
      )}

      {showAnalyzing && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black animate-fade-in">
          <h2 className="text-2xl font-light text-white tracking-wider mb-2">
            Analyzing Your Memories
          </h2>
          <p className="text-reverie-muted text-sm">
            Finding the best scenes to build your world...
          </p>
        </div>
      )}

      {showLoading && (
        <LoadingState
          phase={state.phase as 'generating' | 'polling'}
          attempt={pollAttempt}
          worldNumber={1}
          maxWorlds={1}
        />
      )}

      {showViewer && (
        <>
          <MemoryWorldViewer
            splatUrl={state.splatUrl || ''}
            thumbnailUrl={state.thumbnailUrl}
            marbleUrl={state.marbleUrl}
            memories={state.memoryState.uploadedMedia}
            themes={state.memoryState.themes}
            onPlaySound={handlePlaySound}
            audioLoading={audioLoading}
            audioPlaying={audioPlaying}
            onMuteToggle={handleMuteToggle}
            muted={muted}
          />
          
          {/* Restart button */}
          <button
            onClick={handleRestart}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2 hover:border-reverie-accent hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 text-reverie-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="text-reverie-muted text-xs tracking-wider">New Lane</span>
          </button>
        </>
      )}
    </>
  );
}
