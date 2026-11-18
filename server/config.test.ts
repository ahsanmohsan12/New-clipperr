import test from 'node:test';
import assert from 'node:assert/strict';
import { getSyncRuntimeConfig, isConfiguredSecret } from './config.ts';

test('isConfiguredSecret rejects empty and placeholder keys', () => {
  assert.equal(isConfiguredSecret(undefined), false);
  assert.equal(isConfiguredSecret(''), false);
  assert.equal(isConfiguredSecret('   '), false);
  assert.equal(isConfiguredSecret('MY_GEMINI_API_KEY'), false);
  assert.equal(isConfiguredSecret('YOUR_GEMINI_API_KEY'), false);
  assert.equal(isConfiguredSecret('AIzaSyRealLookingKeyValue123'), true);
});

test('getSyncRuntimeConfig defaults cleanly to SQLite and local storage when env is empty', () => {
  const cfg = getSyncRuntimeConfig({});
  assert.equal(cfg.database.activeDriver, 'sqlite');
  assert.equal(cfg.database.databaseUrlConfigured, false);
  assert.equal(cfg.storage.activeDriver, 'local');
  assert.equal(cfg.storage.s3Configured, false);
  assert.equal(cfg.ai.geminiConfigured, false);
});
