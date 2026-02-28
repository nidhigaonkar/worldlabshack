import type { Interest } from './lib/openai';

export interface KeyData {
  id: string;
  position: { x: number; y: number; z: number };
  collected: boolean;
  color: 'gold' | 'silver' | 'bronze';
}

export interface WorldData {
  worldNumber: number;
  prompt: string;
  marbleUrl: string;
  caption: string;
  thumbnailUrl?: string;
  splatUrl?: string;
  panoUrl?: string;
  keys: KeyData[];
}

export interface GameState {
  interests: Interest[];
  currentWorldNumber: number;
  worlds: WorldData[];
  previousDescriptions: string[];
  totalKeysCollected: number;
  keysRequiredToWin: number;
}

export type AppState =
  | { phase: 'picking_interests' }
  | { phase: 'generating'; game: GameState; prompt: string }
  | { phase: 'polling'; game: GameState; prompt: string; operationId: string }
  | {
      phase: 'displaying';
      game: GameState;
      prompt: string;
      marbleUrl: string;
      caption: string;
      thumbnailUrl?: string;
      splatUrl?: string;
      panoUrl?: string;
    }
  | {
      phase: 'transitioning';
      game: GameState;
      transitionImageUrl: string;
    }
  | {
      phase: 'escape_complete';
      game: GameState;
    };

export interface WorldResult {
  marbleUrl: string;
  caption: string;
  thumbnailUrl?: string;
  splatUrl?: string;
  panoUrl?: string;
}
