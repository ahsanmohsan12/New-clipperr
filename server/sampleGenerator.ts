import fs from 'fs';
import path from 'path';
import { SAMPLES_DIR, TEMP_DIR } from './db.ts';
import { generateSampleNarrationWav } from './providers/aiProvider.ts';
import { runCmd } from './videoEngine.ts';

interface SampleDefinition {
  slug: string;
  filename: string;
  voice: 'Puck' | 'Kore';
  script: string;
  accentHex: string;
}

const SAMPLE_DEFS: Record<string, SampleDefinition> = {
  'saas-founder-talk': {
    slug: 'saas-founder-talk',
    filename: 'saas-founder-talk.mp4',
    voice: 'Puck',
    accentHex: '0x4cd7f6',
    script:
      'Most founders fail because they build features nobody asked for before talking to ten real customers. Here is the exact three-step framework that took our product from zero to ten million in annual recurring revenue. First, solve an urgent workflow bottleneck people already pay to fix. Second, launch an ugly working version in fourteen days and watch users click live.',
  },
  'creator-growth-deepdive': {
    slug: 'creator-growth-deepdive',
    filename: 'creator-growth-deepdive.mp4',
    voice: 'Kore',
    accentHex: '0xa078ff',
    script:
      'The first three seconds of your video decide ninety percent of your reach across TikTok, Reels, and YouTube Shorts. Never open a clip with a slow introduction or hello guys. Instead, drop the viewer straight into the tension, show visual proof immediately, and deliver one crisp takeaway they can apply today.',
  },
};

function findStudioImagePath(): string | null {
  const imgDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
  if (!fs.existsSync(imgDir)) return null;
  const files = fs.readdirSync(imgDir).filter((f) => f.startsWith('studio_host_preview') && f.endsWith('.jpg'));
  return files.length > 0 ? path.join(imgDir, files[0]) : null;
}

export async function ensureSampleVideo(slugWithExt: string): Promise<string> {
  const slug = slugWithExt.replace(/\.mp4$/i, '');
  const def = SAMPLE_DEFS[slug] ?? SAMPLE_DEFS['saas-founder-talk'];
  const outPath = path.join(SAMPLES_DIR, def.filename);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50_000) {
    return outPath;
  }

  const wavPath = path.join(TEMP_DIR, `${def.slug}_tts.wav`);
  const hasTts = await generateSampleNarrationWav(def.script, def.voice, wavPath);

  const studioImg = findStudioImagePath();
  const durationSec = 22;

  const args: string[] = ['-y'];

  if (studioImg && fs.existsSync(studioImg)) {
    args.push('-loop', '1', '-t', String(durationSec), '-i', studioImg);
  } else {
    args.push('-f', 'lavfi', '-i', `color=c=0x11131c:s=1280x720:d=${durationSec}:r=30`);
  }

  if (hasTts && fs.existsSync(wavPath)) {
    args.push('-i', wavPath);
  } else {
    // Fallback clean tone pulse if TTS key is absent
    args.push(
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=220:sample_rate=44100:duration=${durationSec}`,
    );
  }

  // Create a dynamic 1280x720 video with subtle slow zoom + live audio waveform visualizer (upper-third face framing)
  const vf = studioImg
    ? `[0:v]scale=1280:-2,crop=1280:720:0:(ih-720)*0.22,zoompan=z='min(zoom+0.0008,1.12)':d=${durationSec * 30}:s=1280x720:fps=30[bg];[1:a]showwaves=s=900x120:mode=cline:colors=${def.accentHex}|0xd0bcff:rate=30[waves];[bg][waves]overlay=(W-w)/2:H-160:shortest=1[vout]`
    : `[0:v]fps=30[bg];[1:a]showwaves=s=900x160:mode=cline:colors=${def.accentHex}|0xd0bcff:rate=30[waves];[bg][waves]overlay=(W-w)/2:(H-h)/2:shortest=1[vout]`;

  args.push(
    '-filter_complex',
    vf,
    '-map',
    '[vout]',
    '-map',
    '1:a',
    '-shortest',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-movflags',
    '+faststart',
    outPath,
  );

  await runCmd('ffmpeg', args, 120_000);

  try {
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  } catch {
    // ignore
  }

  return outPath;
}
