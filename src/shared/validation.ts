import type {
  CaptionStyleId,
  MusicTrackId,
  SourcePlatform,
  TranscriptSegment,
} from './types.ts';

export interface CaptionStyleMeta {
  id: CaptionStyleId;
  label: string;
  badge?: string;
  description: string;
  primaryHex: string;
  highlightHex: string;
}

export const CAPTION_STYLES: CaptionStyleMeta[] = [
  {
    id: 'dynamic_pop',
    label: 'Dynamic Pop',
    badge: 'HOT',
    description: 'Kinetic word-by-word pop with cyan & violet focus',
    primaryHex: '#FFFFFF',
    highlightHex: '#4CD7F6',
  },
  {
    id: 'karaoke_fill',
    label: 'Karaoke Fill',
    description: 'Smooth syllable sweep highlighting spoken words',
    primaryHex: '#E1E1EF',
    highlightHex: '#D0BCFF',
  },
  {
    id: 'word_highlighter',
    label: 'Word Highlighter',
    description: 'High-contrast boxed emphasis behind active phrases',
    primaryHex: '#FFFFFF',
    highlightHex: '#FDE047',
  },
  {
    id: 'bold_punch',
    label: 'Bold Punch',
    description: 'Uppercase thick-stroke impact captions',
    primaryHex: '#FDE047',
    highlightHex: '#4CD7F6',
  },
  {
    id: 'clean_minimal',
    label: 'Clean Minimal',
    description: 'Minimal studio subtitles with subtle drop shadow',
    primaryHex: '#F9FAFB',
    highlightHex: '#D0BCFF',
  },
  {
    id: 'keyword_focus',
    label: 'Keyword Focus',
    description: 'Multi-word lines with neon keyword highlights',
    primaryHex: '#FFFFFF',
    highlightHex: '#A078FF',
  },
];

export interface MusicTrackMeta {
  id: MusicTrackId;
  label: string;
  mood: string;
}

export const MUSIC_TRACKS: MusicTrackMeta[] = [
  { id: 'upbeat_tech', label: 'Upbeat Tech Pulse', mood: 'Energetic · 120 BPM' },
  { id: 'cinematic_pulse', label: 'Cinematic Horizon', mood: 'Warm Pad · Dramatic' },
  { id: 'lofi_focus', label: 'Lo-Fi Creator Groove', mood: 'Chill · Conversational' },
  { id: 'none', label: 'No Background Music', mood: 'Speech + SFX Only' },
];

export const CAPTION_FONTS = [
  'Noto Sans',
  'Noto Sans Display',
  'DejaVu Sans',
] as const;

export const CAPTION_COLOR_SWATCHES = [
  { label: 'Cyan Spark', hex: '#4CD7F6' },
  { label: 'Electric Violet', hex: '#D0BCFF' },
  { label: 'Solar Yellow', hex: '#FDE047' },
  { label: 'Pure White', hex: '#FFFFFF' },
] as const;

export const PIPELINE_STAGE_DEFINITIONS = [
  {
    stageIndex: 1,
    stageKey: 'analyze',
    title: 'Analyzing video & audio transcript',
    defaultSubtitle: 'Extracting audio, scene boundaries & speech transcript',
  },
  {
    stageIndex: 2,
    stageKey: 'viral_detection',
    title: 'Finding engaging viral hooks & moments',
    defaultSubtitle: 'Scoring hooks, emotional peaks & storytelling segments',
  },
  {
    stageIndex: 3,
    stageKey: 'shorts_crop',
    title: 'Generating multiple Shorts',
    defaultSubtitle: 'Reframing to 9:16 vertical around active speaker',
  },
  {
    stageIndex: 4,
    stageKey: 'captions',
    title: 'Adding captions & kinetic animations',
    defaultSubtitle: 'Synchronizing animated subtitles inside safe margins',
  },
  {
    stageIndex: 5,
    stageKey: 'sound_design',
    title: 'Applying sound effects & audio leveling',
    defaultSubtitle: 'Adding transitions, SFX & speech-ducked background music',
  },
  {
    stageIndex: 6,
    stageKey: 'render',
    title: 'Rendering 1080x1920 MP4 videos',
    defaultSubtitle: 'Encoding H.264 / AAC Shorts ready for upload',
  },
] as const;

export interface SampleVideoMeta {
  slug: string;
  label: string;
  title: string;
  durationLabel: string;
  durationSec: number;
  samplePath: string;
}

export const SAMPLE_VIDEOS: SampleVideoMeta[] = [
  {
    slug: 'saas-founder-talk',
    label: 'SaaS Founder Talk',
    title: 'How to Build a $10M SaaS — Founder Playbook',
    durationLabel: '0:24',
    durationSec: 24,
    samplePath: '/api/samples/saas-founder-talk.mp4',
  },
  {
    slug: 'creator-growth-deepdive',
    label: 'Creator Growth Deep Dive',
    title: 'How We Got 1M Users in 30 Days — Growth Breakdown',
    durationLabel: '0:24',
    durationSec: 24,
    samplePath: '/api/samples/creator-growth-deepdive.mp4',
  },
];

export function detectUrlPlatform(rawUrl: string): {
  valid: boolean;
  platform: SourcePlatform;
  normalizedUrl: string;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      valid: false,
      platform: 'unknown',
      normalizedUrl: '',
      error: 'Please enter a video URL or upload a video file.',
    };
  }

  // Allow relative sample URLs hosted by this app
  if (trimmed.startsWith('/api/samples/')) {
    return {
      valid: true,
      platform: 'sample',
      normalizedUrl: trimmed,
    };
  }

  let parsed: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return {
      valid: false,
      platform: 'unknown',
      normalizedUrl: trimmed,
      error: 'Enter a valid http:// or https:// video URL.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      platform: 'unknown',
      normalizedUrl: trimmed,
      error: 'Only http:// and https:// URLs are supported.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be'
  ) {
    return { valid: true, platform: 'youtube', normalizedUrl: parsed.toString() };
  }

  if (host.endsWith('tiktok.com')) {
    return { valid: true, platform: 'tiktok', normalizedUrl: parsed.toString() };
  }

  if (host.endsWith('twitch.tv')) {
    return { valid: true, platform: 'twitch', normalizedUrl: parsed.toString() };
  }

  if (/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i.test(pathname) || pathname.includes('/api/samples/')) {
    return { valid: true, platform: 'direct_mp4', normalizedUrl: parsed.toString() };
  }

  return {
    valid: true,
    platform: 'direct_mp4',
    normalizedUrl: parsed.toString(),
  };
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function clampClipRange(
  startSec: number,
  endSec: number,
  sourceDurationSec: number,
  minClipSec = 3,
): { startSec: number; endSec: number } {
  const maxDur = Math.max(minClipSec, sourceDurationSec);
  const safeStart = Math.max(0, Math.min(startSec, maxDur - minClipSec));
  const safeEnd = Math.max(safeStart + minClipSec, Math.min(endSec, maxDur));
  return {
    startSec: Number(safeStart.toFixed(2)),
    endSec: Number(safeEnd.toFixed(2)),
  };
}

export function sliceTranscriptForClip(
  segments: TranscriptSegment[],
  clipStartSec: number,
  clipEndSec: number,
): TranscriptSegment[] {
  const result: TranscriptSegment[] = [];
  for (const seg of segments) {
    if (seg.endSec <= clipStartSec || seg.startSec >= clipEndSec) {
      continue;
    }
    const relStart = Math.max(0, Number((seg.startSec - clipStartSec).toFixed(2)));
    const relEnd = Math.min(
      Number((clipEndSec - clipStartSec).toFixed(2)),
      Number((seg.endSec - clipStartSec).toFixed(2)),
    );
    if (relEnd - relStart >= 0.15 && seg.text.trim()) {
      result.push({
        id: seg.id,
        startSec: relStart,
        endSec: relEnd,
        text: seg.text.trim(),
        speaker: seg.speaker,
      });
    }
  }
  return result;
}
