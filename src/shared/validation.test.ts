import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampClipRange,
  detectUrlPlatform,
  formatDuration,
  formatFileSize,
  sliceTranscriptForClip,
} from './validation.ts';

test('detectUrlPlatform rejects empty and malformed URLs', () => {
  assert.equal(detectUrlPlatform('').valid, false);
  assert.equal(detectUrlPlatform('   ').valid, false);
  assert.equal(detectUrlPlatform('not a url with spaces').valid, false);
});

test('detectUrlPlatform identifies YouTube, TikTok, Twitch, direct MP4, and samples', () => {
  const yt = detectUrlPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(yt.valid, true);
  assert.equal(yt.platform, 'youtube');

  const shortYt = detectUrlPlatform('https://youtu.be/abc123');
  assert.equal(shortYt.valid, true);
  assert.equal(shortYt.platform, 'youtube');

  const mp4 = detectUrlPlatform('https://cdn.example.com/videos/podcast.mp4');
  assert.equal(mp4.valid, true);
  assert.equal(mp4.platform, 'direct_mp4');

  const sample = detectUrlPlatform('/api/samples/saas-founder-talk.mp4');
  assert.equal(sample.valid, true);
  assert.equal(sample.platform, 'sample');
});

test('formatDuration and formatFileSize format cleanly', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(48), '0:48');
  assert.equal(formatDuration(1122), '18:42');
  assert.equal(formatFileSize(0), '0 MB');
  assert.equal(formatFileSize(1024 * 50), '50 KB');
  assert.equal(formatFileSize(1024 * 512), '0.5 MB');
  assert.equal(formatFileSize(1024 * 1024 * 14.2), '14.2 MB');
});

test('clampClipRange respects source bounds and minimum clip length', () => {
  const clamped = clampClipRange(-5, 999, 24, 3);
  assert.equal(clamped.startSec, 0);
  assert.equal(clamped.endSec, 24);

  const shortClamped = clampClipRange(22, 23, 24, 3);
  assert.equal(shortClamped.startSec, 21);
  assert.equal(shortClamped.endSec, 24);
});

test('sliceTranscriptForClip shifts segment timestamps relative to clip start', () => {
  const sliced = sliceTranscriptForClip(
    [
      { id: '1', startSec: 0, endSec: 3, text: 'Before clip' },
      { id: '2', startSec: 4, endSec: 8, text: 'Inside hook' },
      { id: '3', startSec: 8, endSec: 12, text: 'Middle point' },
      { id: '4', startSec: 15, endSec: 18, text: 'After clip' },
    ],
    5,
    11,
  );
  assert.equal(sliced.length, 2);
  assert.equal(sliced[0].startSec, 0);
  assert.equal(sliced[0].endSec, 3);
  assert.equal(sliced[0].text, 'Inside hook');
  assert.equal(sliced[1].startSec, 3);
  assert.equal(sliced[1].endSec, 6);
});
