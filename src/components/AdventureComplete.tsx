import type { GameState } from '../types';

interface Props {
  game: GameState;
  onRestart: () => void;
}

export function AdventureComplete({ game, onRestart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black px-6 py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extralight tracking-[0.3em] text-white uppercase mb-3">
          Adventure Complete
        </h1>
        <p className="text-reverie-accent text-sm tracking-widest uppercase">
          You explored {game.worlds.length} worlds
        </p>
      </div>

      <div className="w-full max-w-3xl mb-8">
        <div className="grid gap-4">
          {game.worlds.map((world, index) => (
            <div
              key={index}
              className="bg-reverie-surface border border-reverie-border rounded-xl p-4 hover:border-reverie-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-reverie-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-reverie-accent font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed line-clamp-2">
                    {world.caption || world.prompt}
                  </p>
                </div>
                {world.thumbnailUrl && (
                  <a
                    href={world.marbleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 group relative"
                  >
                    <img
                      src={world.thumbnailUrl}
                      alt={`World ${index + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border border-reverie-border group-hover:border-reverie-accent transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </a>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-reverie-border/50">
                <a
                  href={world.marbleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-reverie-accent/20 border border-reverie-accent/50 text-reverie-accent text-xs hover:bg-reverie-accent/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open in Marble
                </a>
                {world.panoUrl && (
                  <a
                    href={world.panoUrl}
                    download={`world-${index + 1}-panorama.jpg`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Panorama
                  </a>
                )}
                {world.splatUrl && (
                  <a
                    href={world.splatUrl}
                    download={`world-${index + 1}-splat.spz`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-xs hover:bg-green-500/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Splat
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-reverie-muted text-sm">
          Your interests: {game.interests.map(i => i.emoji).join(' ')}
        </p>
        <button
          onClick={onRestart}
          className="
            px-8 py-3.5 rounded-xl font-medium tracking-widest uppercase text-sm
            bg-reverie-accent text-white hover:bg-reverie-glow
            transition-all duration-200
          "
        >
          Start New Adventure
        </button>
      </div>
    </div>
  );
}

export function EscapeComplete({ game, onRestart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black px-6 py-12 animate-fade-in">
      {/* Victory celebration */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-5xl font-extralight tracking-[0.3em] text-white uppercase mb-3">
          YOU ESCAPED!
        </h1>
        <p className="text-green-400 text-sm tracking-widest uppercase mb-2">
          All {game.totalKeysCollected} keys collected
        </p>
        <p className="text-reverie-accent text-xs tracking-wider">
          You navigated through {game.worlds.length} dimensional rooms
        </p>
      </div>
      
      {/* Stats */}
      <div className="flex gap-6 mb-8">
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl px-6 py-4 text-center">
          <div className="text-3xl mb-1">🔑</div>
          <div className="text-amber-400 text-2xl font-bold">{game.totalKeysCollected}</div>
          <div className="text-amber-300/60 text-xs uppercase tracking-wider">Keys Found</div>
        </div>
        <div className="bg-purple-900/30 border border-purple-600/50 rounded-xl px-6 py-4 text-center">
          <div className="text-3xl mb-1">🚪</div>
          <div className="text-purple-400 text-2xl font-bold">{game.worlds.length}</div>
          <div className="text-purple-300/60 text-xs uppercase tracking-wider">Rooms Escaped</div>
        </div>
      </div>

      <div className="w-full max-w-3xl mb-8">
        <h3 className="text-white text-sm tracking-widest uppercase mb-4 text-center">Your Journey</h3>
        <div className="grid gap-4">
          {game.worlds.map((world, index) => (
            <div
              key={index}
              className="bg-reverie-surface border border-reverie-border rounded-xl p-4 hover:border-reverie-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-reverie-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-reverie-accent font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed line-clamp-2">
                    {world.caption || world.prompt}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {world.keys.map((key) => (
                      <span key={key.id} className="text-sm" title={`${key.color} key`}>
                        {key.collected ? '🔑' : '⬜'}
                      </span>
                    ))}
                    <span className="text-reverie-muted text-xs ml-2">
                      {world.keys.filter(k => k.collected).length}/{world.keys.length} keys
                    </span>
                  </div>
                </div>
                {world.thumbnailUrl && (
                  <a
                    href={world.marbleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 group relative"
                  >
                    <img
                      src={world.thumbnailUrl}
                      alt={`Room ${index + 1}`}
                      className="w-20 h-20 rounded-lg object-cover border border-reverie-border group-hover:border-reverie-accent transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </div>
                  </a>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-reverie-border/50">
                <a
                  href={world.marbleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-reverie-accent/20 border border-reverie-accent/50 text-reverie-accent text-xs hover:bg-reverie-accent/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Revisit Room
                </a>
                {world.panoUrl && (
                  <a
                    href={world.panoUrl}
                    download={`room-${index + 1}-panorama.jpg`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Panorama
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-reverie-muted text-sm">
          Escape themes: {game.interests.map(i => i.emoji).join(' ')}
        </p>
        <button
          onClick={onRestart}
          className="
            px-8 py-3.5 rounded-xl font-medium tracking-widest uppercase text-sm
            bg-reverie-accent text-white hover:bg-reverie-glow
            transition-all duration-200
          "
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
