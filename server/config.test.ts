import test from 'node:test';
import assert from 'node:assert/strict';
import { getSyncRuntimeConfig, isConfiguredSecret, resolveMediaIngestEnv } from './config.ts';

test('isConfiguredSecret rejects empty and placeholder keys', () => {
  assert.equal(isConfiguredSecret(undefined), false);
  assert.equal(isConfiguredSecret(''), false);
  assert.equal(isConfiguredSecret('   '), false);
  assert.equal(isConfiguredSecret('MY_GEMINI_API_KEY'), false);
  assert.equal(isConfiguredSecret('YOUR_GEMINI_API_KEY'), false);
  assert.equal(isConfiguredSecret('AIzaSyRealLookingKeyValue123'), true);
});

test('resolveMediaIngestEnv supports both MEDIA_INGEST_CMD and MEDIA_INGEST', () => {
  assert.equal(resolveMediaIngestEnv({}), null);
  assert.equal(resolveMediaIngestEnv({ MEDIA_INGEST: 'yt-dlp' }), 'yt-dlp');
  assert.equal(
    resolveMediaIngestEnv({ MEDIA_INGEST_CMD: '/usr/local/bin/yt-dlp', MEDIA_INGEST: 'yt-dlp' }),
    '/usr/local/bin/yt-dlp',
  );
});

test('getSyncRuntimeConfig defaults cleanly to SQLite and local storage when env is empty', () => {
  const cfg = getSyncRuntimeConfig({});
  assert.equal(cfg.database.activeDriver, 'sqlite');
  assert.equal(cfg.database.databaseUrlConfigured, false);
  assert.equal(cfg.storage.activeDriver, 'local');
  assert.equal(cfg.storage.s3Configured, false);
  assert.equal(cfg.mediaIngestEnvCommand, null);
  assert.equal(cfg.ai.geminiConfigured, false);
});
