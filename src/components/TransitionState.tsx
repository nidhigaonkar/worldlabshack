interface Props {
  transitionImageUrl: string;
  worldNumber: number;
  maxWorlds: number;
}

export function TransitionState({ transitionImageUrl, worldNumber, maxWorlds }: Props) {
  return (
    <div className="fixed inset-0 bg-reverie-black overflow-hidden">
      <img
        src={transitionImageUrl}
        className="w-full h-full object-cover animate-pulse-slow"
        alt="Portal transition"
      />
      
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/30" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-blue-400 border-b-transparent animate-spin-reverse" />
          </div>
          
          <p className="text-white text-xl font-light tracking-widest mb-2">
            TRAVELING THROUGH THE PORTAL
          </p>
          <p className="text-purple-300/80 text-sm tracking-wider">
            Entering World {worldNumber} of {maxWorlds}
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex gap-2">
          {Array.from({ length: maxWorlds }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                i < worldNumber
                  ? 'bg-purple-400 scale-100'
                  : i === worldNumber - 1
                  ? 'bg-purple-400 animate-pulse scale-125'
                  : 'bg-white/20 scale-100'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
