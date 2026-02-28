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

// Memory Lane types
export interface MemoryMedia {
  id: string;
  type: 'image' | 'video';
  dataUrl: string;
  thumbnail?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface MemoryLaneState {
  uploadedMedia: MemoryMedia[];
  selectedSceneIndices: number[];
  themes: string[];
  worldPrompt: string;
}

export type MemoryAppState =
  | { phase: 'uploading' }
  | { phase: 'analyzing'; media: MemoryMedia[] }
  | { phase: 'generating'; memoryState: MemoryLaneState; prompt: string }
  | { phase: 'polling'; memoryState: MemoryLaneState; prompt: string; operationId: string }
  | {
      phase: 'displaying';
      memoryState: MemoryLaneState;
      marbleUrl: string;
      caption: string;
      thumbnailUrl?: string;
      splatUrl?: string;
      panoUrl?: string;
    };
