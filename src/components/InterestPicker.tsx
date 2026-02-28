import { useState } from 'react';
import { INTERESTS, type Interest } from '../lib/openai';
import { getSavedWorlds } from '../lib/worldlabs';
import { SavedWorldsViewer } from './SavedWorldsViewer';

interface Props {
  onComplete: (selectedInterests: Interest[]) => void;
}

export function InterestPicker({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSavedWorlds, setShowSavedWorlds] = useState(false);
  const savedWorldsCount = getSavedWorlds().length;

  function toggleInterest(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function handleContinue() {
    const selectedInterests = INTERESTS.filter(i => selected.has(i.id));
    onComplete(selectedInterests);
  }

  const canContinue = selected.size >= 3;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black px-6 py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extralight tracking-[0.3em] text-white uppercase mb-3">
          ESCAPE
        </h1>
        <p className="text-reverie-muted text-sm tracking-widest uppercase mb-2">
          The Dimensional Escape Room
        </p>
        <p className="text-reverie-accent text-xs tracking-wider">
          Select at least 3 themes for your escape room
        </p>
      </div>

      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {INTERESTS.map((interest) => {
            const isSelected = selected.has(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  flex flex-col items-center justify-center gap-2
                  ${isSelected
                    ? 'bg-reverie-accent/20 border-reverie-accent text-white scale-105 shadow-lg shadow-reverie-accent/20'
                    : 'bg-reverie-surface border-reverie-border text-reverie-muted hover:border-reverie-accent/50 hover:text-white'
                  }
                `}
              >
                <span className="text-3xl">{interest.emoji}</span>
                <span className="text-sm font-medium tracking-wide">{interest.name}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-reverie-accent rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-reverie-muted text-sm">
          {selected.size} of 3+ selected
        </p>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`
            px-8 py-3.5 rounded-xl font-medium tracking-widest uppercase text-sm
            transition-all duration-200
            ${canContinue
              ? 'bg-reverie-accent text-white hover:bg-reverie-glow cursor-pointer'
              : 'bg-reverie-surface text-reverie-muted cursor-not-allowed opacity-50'
            }
          `}
        >
          Start Game
        </button>
      </div>

      <div className="mt-12 max-w-lg text-center">
        <div className="bg-reverie-surface/50 border border-reverie-border rounded-xl p-4 space-y-2">
          <p className="text-amber-400 text-sm font-medium flex items-center justify-center gap-2">
            <span className="text-lg">🔑</span> How to Escape
          </p>
          <p className="text-reverie-border text-xs leading-relaxed">
            You're trapped in dimensional rooms. Explore each space and collect 
            <span className="text-amber-400 font-medium"> 3 hidden keys</span> scattered throughout.
            <br />
            Once all keys are found, the <span className="text-purple-400">portal</span> activates and you escape!
          </p>
          <p className="text-reverie-muted text-[10px] tracking-wider uppercase mt-2">
            Use WASD to move • Mouse to look • Navigate carefully to find all keys
          </p>
        </div>
      </div>

      {savedWorldsCount > 0 && (
        <button
          onClick={() => setShowSavedWorlds(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-reverie-surface/80 border border-reverie-border text-reverie-muted text-xs hover:text-white hover:border-reverie-accent/50 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {savedWorldsCount} saved
        </button>
      )}

      {showSavedWorlds && (
        <SavedWorldsViewer onClose={() => setShowSavedWorlds(false)} />
      )}
    </div>
  );
}
