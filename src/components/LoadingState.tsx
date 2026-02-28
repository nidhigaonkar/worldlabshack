interface Props {
  phase: 'generating' | 'polling';
  attempt?: number;
  worldNumber?: number;
  maxWorlds?: number;
}

export function LoadingState({ phase, attempt, worldNumber, maxWorlds }: Props) {
  const statusText =
    phase === 'generating'
      ? 'Generating world description…'
      : `Building your world… (${attempt ?? 0}/60)`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black gap-8">
      {worldNumber && maxWorlds && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-reverie-accent text-sm tracking-wider font-medium">
            Creating World {worldNumber} of {maxWorlds}
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
      )}

      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-reverie-border" />
        <div className="absolute inset-0 rounded-full border-2 border-t-reverie-accent animate-spin" />
      </div>

      <div className="text-center">
        <p className="text-reverie-muted text-sm tracking-wider">{statusText}</p>
      </div>

      <div className="w-64 h-1 bg-reverie-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full animate-shimmer"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, #7c6df5 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  );
}
