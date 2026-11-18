import fs from 'fs';
import path from 'path';
import type { MusicTrackId } from '../src/shared/types.ts';
import { ASSETS_DIR } from './db.ts';

const SAMPLE_RATE = 44100;

function writeStereoWav(filePath: string, durationSec: number, generator: (t: number, i: number) => [number, number]): void {
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    return;
  }

  const numSamples = Math.floor(durationSec * SAMPLE_RATE);
  const dataBytes = numSamples * 4; // 2 channels * 2 bytes (16-bit)
  const buffer = Buffer.alloc(44 + dataBytes);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(2, 22);  // Stereo
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // Byte rate
  buffer.writeUInt16LE(4, 32);  // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const [l, r] = generator(t, i);
    const clampedL = Math.max(-0.98, Math.min(0.98, l));
    const clampedR = Math.max(-0.98, Math.min(0.98, r));
    buffer.writeInt16LE(Math.round(clampedL * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(clampedR * 32767), 44 + i * 4 + 2);
  }

  fs.writeFileSync(filePath, buffer);
}

export function ensureAudioAssets(): {
  whooshPath: string;
  popPath: string;
  impactPath: string;
  bgmPaths: Record<Exclude<MusicTrackId, 'none'>, string>;
} {
  const whooshPath = path.join(ASSETS_DIR, 'sfx_whoosh.wav');
  const popPath = path.join(ASSETS_DIR, 'sfx_pop.wav');
  const impactPath = path.join(ASSETS_DIR, 'sfx_impact.wav');

  const bgmUpbeatPath = path.join(ASSETS_DIR, 'bgm_upbeat_tech.wav');
  const bgmCinematicPath = path.join(ASSETS_DIR, 'bgm_cinematic_pulse.wav');
  const bgmLofiPath = path.join(ASSETS_DIR, 'bgm_lofi_focus.wav');

  // Deterministic pseudo-random helper for crisp filtered noise whoosh
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };

  let prevNoise = 0;
  writeStereoWav(whooshPath, 0.55, (t) => {
    const env = Math.sin(Math.min(1, t / 0.55) * Math.PI) ** 1.6;
    const raw = nextRand();
    const alpha = 0.08 + 0.35 * Math.sin((t / 0.55) * Math.PI);
    prevNoise = prevNoise + alpha * (raw - prevNoise);
    const sweep = Math.sin(2 * Math.PI * (140 + t * 520) * t) * 0.15;
    const val = (prevNoise * 0.7 + sweep) * env * 0.55;
    return [val, val * 0.95];
  });

  writeStereoWav(popPath, 0.22, (t) => {
    const env = Math.exp(-t * 28);
    const freq = 520 + 680 * Math.exp(-t * 45);
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
    const val = tone * env * 0.5;
    return [val, val];
  });

  writeStereoWav(impactPath, 0.85, (t) => {
    const subEnv = Math.exp(-t * 5.5);
    const subFreq = 115 * Math.exp(-t * 6) + 42;
    const sub = Math.sin(2 * Math.PI * subFreq * t) * subEnv;
    const click = t < 0.02 ? Math.sin(2 * Math.PI * 1200 * t) * (1 - t / 0.02) * 0.45 : 0;
    const val = (sub * 0.72 + click) * 0.75;
    return [val, val];
  });

  // 8-second seamless loop: Upbeat Tech Pulse (120 BPM)
  const techNotes = [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 392.0];
  writeStereoWav(bgmUpbeatPath, 8.0, (t) => {
    const beat = (t * 2) % 1;
    const step = Math.floor(t * 4) % techNotes.length;
    const noteFreq = techNotes[step];
    const stepPhase = (t * 4) % 1;
    const arpEnv = Math.exp(-stepPhase * 5.5);
    const arp = (Math.sin(2 * Math.PI * noteFreq * t) + 0.25 * Math.sin(4 * Math.PI * noteFreq * t)) * arpEnv * 0.2;
    const pad = (Math.sin(2 * Math.PI * 130.81 * t) + Math.sin(2 * Math.PI * 196.0 * t)) * 0.08;
    const kick = beat < 0.14 ? Math.sin(2 * Math.PI * (120 * Math.exp(-beat * 20) + 45) * beat) * Math.exp(-beat * 18) * 0.28 : 0;
    const l = arp + pad + kick;
    const r = arp * 0.9 + pad * 1.05 + kick;
    return [l, r];
  });

  // 8-second seamless loop: Cinematic Horizon
  writeStereoWav(bgmCinematicPath, 8.0, (t) => {
    const swell = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.25 * t);
    const root = Math.sin(2 * Math.PI * 110 * t) * 0.16;
    const fifth = Math.sin(2 * Math.PI * 164.81 * t) * 0.12;
    const shimmer = Math.sin(2 * Math.PI * 329.63 * t) * 0.07 * swell;
    const pulse = Math.exp(-((t * 1.5) % 1) * 4) * Math.sin(2 * Math.PI * 55 * t) * 0.2;
    return [(root + fifth + shimmer + pulse) * swell, (root + fifth * 1.05 + shimmer * 0.9 + pulse) * swell];
  });

  // 8-second seamless loop: Lo-Fi Focus
  const lofiChords = [
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 349.23],
  ];
  writeStereoWav(bgmLofiPath, 8.0, (t) => {
    const chordIdx = Math.floor(t / 4) % lofiChords.length;
    const chord = lofiChords[chordIdx];
    const barPos = (t % 4) / 4;
    const env = Math.sin(Math.min(1, barPos * 8) * (Math.PI / 2)) * Math.exp(-barPos * 1.4);
    let sum = 0;
    for (const f of chord) {
      sum += Math.sin(2 * Math.PI * f * t) * 0.08;
    }
    const beat = (t * 1.5) % 1;
    const softKick = beat < 0.12 ? Math.sin(2 * Math.PI * 70 * beat) * Math.exp(-beat * 22) * 0.18 : 0;
    const val = sum * env + softKick;
    return [val, val * 0.96];
  });

  return {
    whooshPath,
    popPath,
    impactPath,
    bgmPaths: {
      upbeat_tech: bgmUpbeatPath,
      cinematic_pulse: bgmCinematicPath,
      lofi_focus: bgmLofiPath,
    },
  };
}
