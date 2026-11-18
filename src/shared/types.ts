export type CaptionStyleId =
  | 'dynamic_pop'
  | 'karaoke_fill'
  | 'word_highlighter'
  | 'bold_punch'
  | 'clean_minimal'
  | 'keyword_focus';

export type MusicTrackId =
  | 'upbeat_tech'
  | 'cinematic_pulse'
  | 'lofi_focus'
  | 'none';

export type ProjectStatus =
  | 'created'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ClipStatus = 'pending' | 'rendering' | 'ready' | 'failed';

export type SourcePlatform =
  | 'direct_mp4'
  | 'upload'
  | 'sample'
  | 'youtube'
  | 'tiktok'
  | 'twitch'
  | 'unknown';

export interface TranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
}

export interface ProcessingStage {
  stageIndex: number;
  stageKey: string;
  title: string;
  subtitle: string;
  status: StageStatus;
  errorMessage?: string | null;
}

export interface Clip {
  id: string;
  projectId: string;
  title: string;
  hookText: string;
  viralScore: number;
  hookDelayLabel: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  captionStyle: CaptionStyleId;
  captionColor: string;
  captionFont: string;
  cropXOffset: number;
  musicTrack: MusicTrackId;
  speechVolume: number;
  musicVolume: number;
  subtitles: TranscriptSegment[];
  fileSizeBytes: number;
  width: number;
  height: number;
  fps: number;
  status: ClipStatus;
  errorMessage?: string | null;
  streamUrl: string;
  downloadUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  sourceType: 'url' | 'upload' | 'sample';
  sourceUrl?: string | null;
  platform: SourcePlatform;
  thumbnailUrl?: string | null;
  durationSec: number;
  width: number;
  height: number;
  status: ProjectStatus;
  currentStage: number;
  progressPct: number;
  etaSeconds: number;
  errorMessage?: string | null;
  captionStyle: CaptionStyleId;
  fps: number;
  stages: ProcessingStage[];
  clips: Clip[];
  clipCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UrlInspectionResult {
  valid: boolean;
  platform: SourcePlatform;
  normalizedUrl: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  canDirectIngest: boolean;
  restrictionReason?: string;
}

export interface ClipRegeneratePayload {
  title?: string;
  startSec?: number;
  endSec?: number;
  captionStyle?: CaptionStyleId;
  captionColor?: string;
  captionFont?: string;
  cropXOffset?: number;
  musicTrack?: MusicTrackId;
  speechVolume?: number;
  musicVolume?: number;
  subtitles?: TranscriptSegment[];
  fps?: number;
}
