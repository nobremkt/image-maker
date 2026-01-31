
export type AspectRatio = "16:9" | "1:1" | "9:16";

export interface ReferenceImage {
  data: string;
  mimeType: string;
}

export interface Scene {
  id: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  aspectRatio?: AspectRatio;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export interface VideoItem {
  id: string;
  imageData: string;
  mimeType: string;
  dialogue: string;
  videoUrl?: string;
  status: 'waiting' | 'generating' | 'polling' | 'completed' | 'error';
  progress: number;
}

export enum AppRoute {
  EXPLAINER = 'explainer',
  VIDEO_GENERATION = 'video-gen',
  SETTINGS = 'settings'
}
