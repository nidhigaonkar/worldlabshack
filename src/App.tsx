import { useCallback, useRef, useState } from 'react';
import type { AppState, GameState, WorldData, KeyData } from './types';
import { generateWorld, pollOperation } from './lib/worldlabs';
import { generateWorldDescription, getSoundPrompt, type Interest } from './lib/openai';
import { generateSoundEffect, startAudioLoop, unlockAudio, type AudioEngine } from './lib/elevenlabs';
import { generateTransitionImage } from './lib/gemini';
import { InterestPicker } from './components/InterestPicker';
import { LoadingState } from './components/LoadingState';
import { WorldViewer } from './components/WorldViewer';
import { EscapeComplete } from './components/AdventureComplete';
import { TransitionState } from './components/TransitionState';
import { MemoryLaneApp } from './components/MemoryLaneApp';

const MAX_WORLDS = 3;
const KEYS_PER_WORLD = 1;
const KEYS_REQUIRED_TO_WIN = 3;

type AppMode = 'select' | 'escape' | 'memory';

function ModeSelector({ onSelectMode }: { onSelectMode: (mode: 'escape' | 'memory') => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black px-6 py-12 animate-fade-in">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-extralight tracking-[0.3em] text-white uppercase mb-3">
          REVERIE
        </h1>
        <p className="text-reverie-muted text-sm tracking-widest uppercase">
          Choose Your Experience
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 max-w-3xl">
        {/* Escape Room Mode */}
        <button
          onClick={() => onSelectMode('escape')}
          className="group flex-1 bg-reverie-surface border-2 border-reverie-border hover:border-purple-500 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
        >
          <div className="text-6xl mb-4">🔮</div>
          <h2 className="text-2xl font-light text-white tracking-wider mb-2 group-hover:text-purple-300 transition-colors">
            Escape Room
          </h2>
          <p className="text-reverie-muted text-sm leading-relaxed">
            Explore AI-generated dimensional rooms. Collect keys to unlock portals and escape through surreal worlds.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-purple-400 text-xs tracking-wider uppercase">
            <span>3 Rooms</span>
            <span>•</span>
            <span>Collect Keys</span>
            <span>•</span>
            <span>Escape</span>
          </div>
        </button>

        {/* Memory Lane Mode */}
        <button
          onClick={() => onSelectMode('memory')}
          className="group flex-1 bg-reverie-surface border-2 border-reverie-border hover:border-amber-500 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/20"
        >
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl font-light text-white tracking-wider mb-2 group-hover:text-amber-300 transition-colors">
            Memory Lane
          </h2>
          <p className="text-reverie-muted text-sm leading-relaxed">
            Upload your photos and videos. Walk through a personalized 3D world built from your memories.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-amber-400 text-xs tracking-wider uppercase">
            <span>Upload Media</span>
            <span>•</span>
            <span>AI World</span>
            <span>•</span>
            <span>Relive</span>
          </div>
        </button>
      </div>

      <p className="mt-12 text-reverie-border text-xs text-center max-w-md">
        Powered by World Labs Marble AI for spatial world generation
      </p>
    </div>
  );
}

function generateKeysForWorld(worldNumber: number): KeyData[] {
  const colors: ('gold' | 'silver' | 'bronze')[] = ['gold', 'silver', 'bronze'];
  const keys: KeyData[] = [];
  
  // User starts at (0, 0, 3), portal is at (0, 0, -3)
  // Place keys in the navigable area between user and portal, but off to the sides
  for (let i = 0; i < KEYS_PER_WORLD; i++) {
    // Spread keys around at different angles based on world number
    const angle = (Math.PI * 2 * i) / KEYS_PER_WORLD + (worldNumber * 1.2);
    // Keep radius small so keys are close (1-2 units from center)
    const radius = 0.8 + Math.random() * 1.0;
    // Height variation but not too extreme (-0.3 to 0.7 from eye level)
    const height = -0.3 + Math.random() * 1.0;
    // Z position: between user (z=3) and portal (z=-3), so around z=0 to z=2
    const zPos = 0.5 + Math.random() * 1.5;
    
    keys.push({
      id: `world${worldNumber}-key${i}`,
      position: {
        x: Math.sin(angle) * radius,
        y: height,
        z: zPos,
      },
      collected: false,
      color: colors[(worldNumber - 1 + i) % colors.length],
    });
  }
  
  return keys;
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('select');
  const [state, setState] = useState<AppState>({ phase: 'picking_interests' });
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // If in memory mode, render the Memory Lane app
  if (mode === 'memory') {
    return (
      <>
        <MemoryLaneApp />
        <button
          onClick={() => setMode('select')}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-reverie-surface/80 backdrop-blur-sm border border-reverie-border rounded-full px-4 py-2 hover:border-reverie-accent hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 text-reverie-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-reverie-muted text-xs tracking-wider">Back to Menu</span>
        </button>
      </>
    );
  }

  // If in select mode, show mode selector
  if (mode === 'select') {
    return <ModeSelector onSelectMode={(m) => setMode(m)} />;
  }

  function stopAudio() {
    audioEngineRef.current?.stop();
    audioEngineRef.current = null;
    setAudioPlaying(false);
  }

  const handleInterestsSelected = useCallback(async (interests: Interest[]) => {
    stopAudio();
    setError(null);
    setPollAttempt(0);

    const game: GameState = {
      interests,
      currentWorldNumber: 1,
      worlds: [],
      previousDescriptions: [],
      totalKeysCollected: 0,
      keysRequiredToWin: KEYS_REQUIRED_TO_WIN,
    };

    try {
      const prompt = await generateWorldDescription(interests, 1, []);
      setState({ phase: 'generating', game, prompt });

      const operationId = await generateWorld(prompt);
      setState({ phase: 'polling', game, prompt, operationId });

      const result = await pollOperation(operationId, (attempt) => {
        setPollAttempt(attempt);
      }, prompt);

      const worldKeys = generateKeysForWorld(1);

      const worldData: WorldData = {
        worldNumber: 1,
        prompt,
        marbleUrl: result.marbleUrl,
        caption: result.caption,
        thumbnailUrl: result.thumbnailUrl,
        splatUrl: result.splatUrl,
        panoUrl: result.panoUrl,
        keys: worldKeys,
      };

      const updatedGame: GameState = {
        ...game,
        worlds: [worldData],
        previousDescriptions: [result.caption || prompt],
      };

      setState({
        phase: 'displaying',
        game: updatedGame,
        prompt,
        marbleUrl: result.marbleUrl,
        caption: result.caption,
        thumbnailUrl: result.thumbnailUrl,
        splatUrl: result.splatUrl,
        panoUrl: result.panoUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setState({ phase: 'picking_interests' });
    }
  }, []);

  const handleKeyCollect = useCallback((keyId: string) => {
    if (state.phase !== 'displaying') return;
    
    const { game } = state;
    const currentWorld = game.worlds[game.currentWorldNumber - 1];
    if (!currentWorld) return;
    
    const updatedKeys = currentWorld.keys.map(k => 
      k.id === keyId ? { ...k, collected: true } : k
    );
    
    const updatedWorld = { ...currentWorld, keys: updatedKeys };
    const updatedWorlds = game.worlds.map((w, i) => 
      i === game.currentWorldNumber - 1 ? updatedWorld : w
    );
    
    const newTotalCollected = game.totalKeysCollected + 1;
    
    const updatedGame: GameState = {
      ...game,
      worlds: updatedWorlds,
      totalKeysCollected: newTotalCollected,
    };
    
    setState({
      ...state,
      game: updatedGame,
    });
    
    console.log(`[App] Key collected: ${keyId}, total: ${newTotalCollected}/${KEYS_REQUIRED_TO_WIN}`);
  }, [state]);

  const handlePortalEnter = useCallback(async () => {
    if (state.phase !== 'displaying') {
      return;
    }

    const { game } = state;
    
    // Check if portal should be locked (not enough keys)
    if (game.totalKeysCollected < KEYS_REQUIRED_TO_WIN) {
      console.log('[App] Portal is locked - need more keys');
      return;
    }
    
    const nextWorldNumber = game.currentWorldNumber + 1;

    if (nextWorldNumber > MAX_WORLDS) {
      stopAudio();
      setState({ phase: 'escape_complete', game });
      return;
    }

    stopAudio();
    setError(null);
    setPollAttempt(0);

    const updatedGame: GameState = {
      ...game,
      currentWorldNumber: nextWorldNumber,
    };

    try {
      // Generate transition image and world prompt in parallel
      const [transitionImageUrl, prompt] = await Promise.all([
        generateTransitionImage().catch((err) => {
          console.warn('[Gemini] Transition image failed, using fallback:', err);
          return null;
        }),
        generateWorldDescription(
          game.interests,
          nextWorldNumber,
          game.previousDescriptions
        ),
      ]);

      // If we have a transition image, show it while generating the world
      if (transitionImageUrl) {
        setState({ phase: 'transitioning', game: updatedGame, transitionImageUrl });
      } else {
        setState({ phase: 'generating', game: updatedGame, prompt });
      }

      const operationId = await generateWorld(prompt);
      
      // Keep showing transition if we have it, otherwise show polling
      if (!transitionImageUrl) {
        setState({ phase: 'polling', game: updatedGame, prompt, operationId });
      }

      const result = await pollOperation(operationId, (attempt) => {
        setPollAttempt(attempt);
      }, prompt);

      const worldKeys = generateKeysForWorld(nextWorldNumber);

      const worldData: WorldData = {
        worldNumber: nextWorldNumber,
        prompt,
        marbleUrl: result.marbleUrl,
        caption: result.caption,
        thumbnailUrl: result.thumbnailUrl,
        splatUrl: result.splatUrl,
        panoUrl: result.panoUrl,
        keys: worldKeys,
      };

      const finalGame: GameState = {
        ...updatedGame,
        worlds: [...game.worlds, worldData],
        previousDescriptions: [...game.previousDescriptions, result.caption || prompt],
      };

      setState({
        phase: 'displaying',
        game: finalGame,
        prompt,
        marbleUrl: result.marbleUrl,
        caption: result.caption,
        thumbnailUrl: result.thumbnailUrl,
        splatUrl: result.splatUrl,
        panoUrl: result.panoUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Go back to displaying current world on error
      setState(state);
    }
  }, [state]);

  const handleRestart = useCallback(() => {
    stopAudio();
    setError(null);
    setState({ phase: 'picking_interests' });
  }, []);

  const handlePlaySound = useCallback(async () => {
    if (state.phase !== 'displaying') return;
    const { caption, prompt } = state;
    stopAudio();
    unlockAudio();
    setAudioLoading(true);
    setAudioPlaying(false);
    try {
      const soundPrompt = await getSoundPrompt(caption || prompt);
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

  function handleDismissError() {
    setError(null);
  }

  const showInterestPicker = state.phase === 'picking_interests';
  const showIframe = state.phase === 'displaying';
  const showLoading = state.phase === 'generating' || state.phase === 'polling';
  const showTransition = state.phase === 'transitioning';
  const showComplete = state.phase === 'escape_complete';

  const currentGame = 'game' in state ? state.game : null;

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

      {showInterestPicker && (
        <InterestPicker onComplete={handleInterestsSelected} />
      )}

      {showLoading && (
        <LoadingState
          phase={state.phase as 'generating' | 'polling'}
          attempt={pollAttempt}
          worldNumber={currentGame?.currentWorldNumber}
          maxWorlds={MAX_WORLDS}
        />
      )}

      {showTransition && currentGame && (
        <TransitionState
          transitionImageUrl={(state as Extract<AppState, { phase: 'transitioning' }>).transitionImageUrl}
          worldNumber={currentGame.currentWorldNumber}
          maxWorlds={MAX_WORLDS}
        />
      )}

      {showIframe && currentGame && (
        <WorldViewer
          marbleUrl={(state as Extract<AppState, { phase: 'displaying' }>).marbleUrl}
          thumbnailUrl={(state as Extract<AppState, { phase: 'displaying' }>).thumbnailUrl}
          splatUrl={(state as Extract<AppState, { phase: 'displaying' }>).splatUrl}
          worldNumber={currentGame.currentWorldNumber}
          maxWorlds={MAX_WORLDS}
          onPortalEnter={handlePortalEnter}
          onPlaySound={handlePlaySound}
          audioLoading={audioLoading}
          audioPlaying={audioPlaying}
          onMuteToggle={handleMuteToggle}
          muted={muted}
          keys={currentGame.worlds[currentGame.currentWorldNumber - 1]?.keys || []}
          totalKeysCollected={currentGame.totalKeysCollected}
          keysRequiredToWin={KEYS_REQUIRED_TO_WIN}
          onKeyCollect={handleKeyCollect}
          portalLocked={currentGame.totalKeysCollected < KEYS_REQUIRED_TO_WIN}
        />
      )}

      {showComplete && currentGame && (
        <EscapeComplete game={currentGame} onRestart={handleRestart} />
      )}
    </>
  );
}
