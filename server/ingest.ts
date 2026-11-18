import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pipeline as streamPipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { SourcePlatform, UrlInspectionResult } from '../src/shared/types.ts';
import { detectUrlPlatform, SAMPLE_VIDEOS } from '../src/shared/validation.ts';
import { checkBinaryOnPath, resolveMediaIngestEnv } from './config.ts';
import { UPLOADS_DIR } from './db.ts';
import { ensureSampleVideo } from './sampleGenerator.ts';

async function fetchYoutubeOembed(url: string): Promise<{ title?: string; thumbnail_url?: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return (await resp.json()) as { title?: string; thumbnail_url?: string };
  } catch {
    return null;
  }
}

export async function inspectVideoUrl(rawUrl: string): Promise<UrlInspectionResult> {
  const detected = detectUrlPlatform(rawUrl);
  if (!detected.valid) {
    return {
      valid: false,
      platform: 'unknown',
      normalizedUrl: detected.normalizedUrl,
      title: '',
      thumbnailUrl: null,
      durationSec: null,
      canDirectIngest: false,
      restrictionReason: detected.error || 'Invalid video URL.',
    };
  }

  if (detected.platform === 'sample') {
    const sample =
      SAMPLE_VIDEOS.find((s) => detected.normalizedUrl.includes(s.slug)) ?? SAMPLE_VIDEOS[0];
    return {
      valid: true,
      platform: 'sample',
      normalizedUrl: sample.samplePath,
      title: sample.title,
      thumbnailUrl: null,
      durationSec: sample.durationSec,
      canDirectIngest: true,
    };
  }

  const hasYtDlp = Boolean(resolveMediaIngestEnv()) || (await checkBinaryOnPath('yt-dlp'));

  if (detected.platform === 'youtube') {
    const meta = await fetchYoutubeOembed(detected.normalizedUrl);
    return {
      valid: true,
      platform: 'youtube',
      normalizedUrl: detected.normalizedUrl,
      title: meta?.title || 'YouTube Video',
      thumbnailUrl: meta?.thumbnail_url || null,
      durationSec: null,
      canDirectIngest: hasYtDlp,
      restrictionReason: hasYtDlp
        ? undefined
        : 'Direct YouTube stream downloading is restricted in this sandbox without an authorized yt-dlp / MEDIA_INGEST_CMD worker. Please upload an authorized MP4/MOV file directly, paste a direct MP4 URL, or try a built-in sample.',
    };
  }

  if (detected.platform === 'tiktok' || detected.platform === 'twitch') {
    return {
      valid: true,
      platform: detected.platform,
      normalizedUrl: detected.normalizedUrl,
      title: `${detected.platform === 'tiktok' ? 'TikTok' : 'Twitch'} Video`,
      thumbnailUrl: null,
      durationSec: null,
      canDirectIngest: hasYtDlp,
      restrictionReason: hasYtDlp
        ? undefined
        : `Automated downloading from ${detected.platform} requires an authorized MEDIA_INGEST_CMD / yt-dlp worker. Upload an authorized MP4 file or paste a direct video URL.`,
    };
  }

  // Direct HTTP/HTTPS video URL check via HEAD
  let title = 'Video from URL';
  try {
    const urlObj = new URL(detected.normalizedUrl);
    const base = path.basename(urlObj.pathname).replace(/\.[^.]+$/, '');
    if (base) title = decodeURIComponent(base).replace(/[-_]+/g, ' ');
  } catch {
    // ignore
  }

  return {
    valid: true,
    platform: 'direct_mp4',
    normalizedUrl: detected.normalizedUrl,
    title,
    thumbnailUrl: null,
    durationSec: null,
    canDirectIngest: true,
  };
}

export async function acquireSourceVideo(
  projectId: string,
  sourceType: 'url' | 'upload' | 'sample',
  platform: SourcePlatform,
  sourceUrl: string | null,
  existingPath: string | null,
): Promise<string> {
  if (existingPath && fs.existsSync(existingPath)) {
    return existingPath;
  }

  if (sourceType === 'sample' || platform === 'sample') {
    const slug = sourceUrl ? path.basename(sourceUrl) : 'saas-founder-talk.mp4';
    return await ensureSampleVideo(slug);
  }

  if (!sourceUrl) {
    throw new Error('Missing source video URL or uploaded file.');
  }

  const destPath = path.join(UPLOADS_DIR, `${projectId}_source.mp4`);

  // Check if third-party platform requires external downloader
  if (platform === 'youtube' || platform === 'tiktok' || platform === 'twitch') {
    const customCmd = resolveMediaIngestEnv();
    const bin = customCmd || ((await checkBinaryOnPath('yt-dlp')) ? 'yt-dlp' : '');
    if (!bin) {
      throw new Error(
        `Source platform (${platform}) restricts direct downloading without an authorized downloader binary (yt-dlp / MEDIA_INGEST_CMD). Upload your authorized MP4/MOV file directly or paste a direct video URL.`,
      );
    }

    await new Promise<void>((resolve, reject) => {
      execFile(
        bin,
        ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4', '-o', destPath, sourceUrl],
        { timeout: 180_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(
              new Error(
                `Unable to download video from ${platform}. Respecting platform access restrictions (${stderr.slice(0, 220) || err.message}). Please upload the MP4 file directly.`,
              ),
            );
          } else {
            resolve();
          }
        },
      );
    });
    return destPath;
  }

  // Direct MP4/WebM/MOV download
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const resp = await fetch(sourceUrl, { signal: controller.signal });
    if (!resp.ok || !resp.body) {
      throw new Error(`Failed to fetch video URL (HTTP ${resp.status}). Ensure the URL points directly to a downloadable video file.`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(
        'The URL returned a webpage (text/html) instead of a video stream. Paste a direct .mp4/.mov/.webm file URL or upload the video file directly.',
      );
    }

    const nodeStream = Readable.fromWeb(resp.body as unknown as import('stream/web').ReadableStream);
    await streamPipeline(nodeStream, fs.createWriteStream(destPath));
    return destPath;
  } finally {
    clearTimeout(timer);
  }
}
