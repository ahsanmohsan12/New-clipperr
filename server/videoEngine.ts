import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { CaptionStyleId, MusicTrackId, TranscriptSegment } from '../src/shared/types.ts';
import { buildAssSubtitles } from './assGenerator.ts';
import { ensureAudioAssets } from './audioAssets.ts';
import { TEMP_DIR } from './db.ts';

export interface VideoProbeResult {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  title?: string;
}

export function runCmd(bin: string, args: string[], timeoutMs = 180_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${bin} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const tail = stderr.slice(-1200);
        reject(new Error(`${bin} exited with code ${code}: ${tail}`));
      }
    });
  });
}

export async function probeVideo(filePath: string): Promise<VideoProbeResult> {
  const { stdout } = await runCmd('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);

  const data = JSON.parse(stdout) as {
    format?: { duration?: string; tags?: Record<string, string> };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
  };

  const videoStream = data.streams?.find((s) => s.codec_type === 'video');
  const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

  if (!videoStream) {
    throw new Error('No valid video stream found in the provided media file.');
  }

  let fps = 30;
  const rateStr = videoStream.avg_frame_rate || videoStream.r_frame_rate || '30/1';
  if (rateStr.includes('/')) {
    const [num, den] = rateStr.split('/').map(Number);
    if (den > 0 && num > 0) {
      fps = Math.round(num / den);
    }
  }

  const durationSec = Math.max(0.5, Number(data.format?.duration || 0));
  return {
    durationSec,
    width: videoStream.width || 1280,
    height: videoStream.height || 720,
    fps: Math.max(24, Math.min(60, fps || 30)),
    hasAudio: Boolean(audioStream),
    title: data.format?.tags?.title,
  };
}

export async function generateThumbnail(
  videoPath: string,
  outJpgPath: string,
  atSec = 1.0,
): Promise<void> {
  await runCmd('ffmpeg', [
    '-y',
    '-ss',
    String(Math.max(0.1, atSec)),
    '-i',
    videoPath,
    '-vframes',
    '1',
    '-q:v',
    '3',
    outJpgPath,
  ]);
}

export async function extractAudioForAi(videoPath: string, outMp3Path: string): Promise<void> {
  await runCmd('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-b:a',
    '64k',
    outMp3Path,
  ]);
}

export async function detectScenesAndCropCenter(videoPath: string): Promise<{
  sceneTimestamps: number[];
  cropCenterRatio: number;
}> {
  const sceneTimestamps: number[] = [];
  let cropCenterRatio = 0.5;

  try {
    const { stderr } = await runCmd(
      'ffmpeg',
      [
        '-i',
        videoPath,
        '-vf',
        "select='gt(scene,0.28)',showinfo,cropdetect=24:16:0",
        '-f',
        'null',
        '-',
      ],
      60_000,
    );

    const ptsMatches = stderr.matchAll(/pts_time:([0-9.]+)/g);
    for (const m of ptsMatches) {
      const val = Number(m[1]);
      if (Number.isFinite(val)) {
        sceneTimestamps.push(Number(val.toFixed(2)));
      }
    }

    // Parse cropdetect x + w/2 to estimate active content horizontal center
    const cropMatches = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
    if (cropMatches.length > 0) {
      const last = cropMatches[cropMatches.length - 1];
      const cw = Number(last[1]);
      const cx = Number(last[3]);
      if (cw > 0) {
        cropCenterRatio = Math.max(0.25, Math.min(0.75, (cx + cw / 2) / (cw + cx * 2 || cw)));
      }
    }
  } catch {
    // Non-fatal: continue with center framing
  }

  return { sceneTimestamps, cropCenterRatio };
}

export interface RenderShortOptions {
  clipId: string;
  sourcePath: string;
  sourceHasAudio: boolean;
  sourceWidth: number;
  sourceHeight: number;
  startSec: number;
  endSec: number;
  cropCenterRatio: number;
  cropXOffset: number; // -1 to 1
  captionStyle: CaptionStyleId;
  captionColor: string;
  captionFont: string;
  subtitles: TranscriptSegment[];
  musicTrack: MusicTrackId;
  speechVolume: number;
  musicVolume: number;
  fps: number;
  outMp4Path: string;
  outThumbPath: string;
}

export async function renderShortClip(opts: RenderShortOptions): Promise<{
  fileSizeBytes: number;
  durationSec: number;
}> {
  const clipDuration = Math.max(2.0, Number((opts.endSec - opts.startSec).toFixed(2)));
  const assPath = path.join(TEMP_DIR, `${opts.clipId}.ass`);
  const assContent = buildAssSubtitles({
    style: opts.captionStyle,
    fontName: opts.captionFont,
    accentHex: opts.captionColor,
    segments: opts.subtitles,
  });
  fs.writeFileSync(assPath, assContent, 'utf8');

  const audioAssets = ensureAudioAssets();
  const targetW = 1080;
  const targetH = 1920;

  // Compute smart horizontal crop offset in scaled 1920-height coordinates
  const effectiveRatio = Math.max(0.1, Math.min(0.9, opts.cropCenterRatio + opts.cropXOffset * 0.35));
  // Escape path for FFmpeg libass filter
  const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");

  // Build video filtergraph:
  // 1) Scale so both dimensions >= 1080x1920 preserving aspect ratio
  // 2) Crop 1080x1920 centered around effectiveRatio
  // 3) Apply slight fade in/out for smooth transitions
  // 4) Burn ASS animated captions
  const isAlreadyVertical = opts.sourceHeight >= opts.sourceWidth * 1.4;
  const scaleAndCrop = isAlreadyVertical
    ? `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`
    : `scale=-2:${targetH},crop=${targetW}:${targetH}:(iw-${targetW})*${effectiveRatio.toFixed(3)}:0`;

  const videoFilter = `[0:v]${scaleAndCrop},fps=${opts.fps},fade=t=in:st=0:d=0.18,fade=t=out:st=${Math.max(
    0.2,
    clipDuration - 0.18,
  ).toFixed(2)}:d=0.18,ass='${escapedAss}'[vout]`;

  const args: string[] = [
    '-y',
    '-ss',
    String(opts.startSec),
    '-t',
    String(clipDuration),
    '-i',
    opts.sourcePath,
  ];

  // Input 1: Whoosh SFX
  args.push('-i', audioAssets.whooshPath);
  // Input 2: Impact SFX
  args.push('-i', audioAssets.impactPath);
  // Input 3: Pop SFX
  args.push('-i', audioAssets.popPath);

  const hasBgm = opts.musicTrack !== 'none' && opts.musicVolume > 0.01;
  if (hasBgm) {
    const bgmPath = audioAssets.bgmPaths[opts.musicTrack as Exclude<MusicTrackId, 'none'>];
    args.push('-stream_loop', '-1', '-t', String(clipDuration), '-i', bgmPath);
  }

  const speechVol = Math.max(0.1, Math.min(2.0, opts.speechVolume)).toFixed(2);
  const musicVol = Math.max(0.0, Math.min(1.0, opts.musicVolume)).toFixed(2);
  const popDelayMs = Math.max(900, Math.round(clipDuration * 450));

  const fmt = 'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo';
  let audioFilter = '';
  if (opts.sourceHasAudio) {
    // Prepare speech track with loudness normalization & stereo format lock
    audioFilter += `[0:a]volume=${speechVol},loudnorm=I=-16:TP=-1.5:LRA=11,${fmt},asplit=2[speech_mix][speech_sc];`;
  } else {
    audioFilter += `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${clipDuration},${fmt},asplit=2[speech_mix][speech_sc];`;
  }

  // Synchronized SFX: whoosh at 30ms, impact at 550ms, pop at mid-hook
  audioFilter += `[1:a]${fmt},adelay=30|30,volume=0.38[sfx1];`;
  audioFilter += `[2:a]${fmt},adelay=550|550,volume=0.30[sfx2];`;
  audioFilter += `[3:a]${fmt},adelay=${popDelayMs}|${popDelayMs},volume=0.32[sfx3];`;

  if (hasBgm) {
    // Duck BGM smoothly whenever speech signal is present using sidechaincompress
    audioFilter += `[4:a]${fmt},volume=${musicVol},afade=t=in:st=0:d=0.4,afade=t=out:st=${Math.max(
      0.2,
      clipDuration - 0.5,
    ).toFixed(2)}:d=0.5[bgm_pre];`;
    audioFilter += `[bgm_pre][speech_sc]sidechaincompress=threshold=0.025:ratio=5:attack=30:release=350,${fmt}[bgm_ducked];`;
    audioFilter += `[speech_mix][sfx1][sfx2][sfx3][bgm_ducked]amix=inputs=5:duration=first:dropout_transition=0:normalize=0[aout]`;
  } else {
    audioFilter += `[speech_sc]anullsink;[speech_mix][sfx1][sfx2][sfx3]amix=inputs=4:duration=first:dropout_transition=0:normalize=0[aout]`;
  }

  args.push(
    '-filter_complex',
    `${videoFilter};${audioFilter}`,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '44100',
    '-movflags',
    '+faststart',
    opts.outMp4Path,
  );

  await runCmd('ffmpeg', args, 240_000);

  const stat = fs.statSync(opts.outMp4Path);
  await generateThumbnail(opts.outMp4Path, opts.outThumbPath, Math.min(1.2, clipDuration / 3));

  try {
    fs.unlinkSync(assPath);
  } catch {
    // ignore cleanup errors
  }

  return {
    fileSizeBytes: stat.size,
    durationSec: clipDuration,
  };
}
