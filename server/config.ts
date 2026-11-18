import { execFile } from 'child_process';

export interface RuntimeCapabilities {
  database: {
    activeDriver: 'sqlite';
    databaseUrlConfigured: boolean;
    note: string;
  };
  storage: {
    activeDriver: 'local';
    s3Configured: boolean;
    bucket: string | null;
    endpoint: string | null;
    note: string;
  };
  mediaIngest: {
    enabled: boolean;
    source: 'env' | 'yt-dlp' | 'disabled';
    command: string | null;
  };
  ai: {
    geminiConfigured: boolean;
  };
}

const PLACEHOLDER_VALUES = new Set([
  '',
  'MY_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'REPLACE_ME',
  'CHANGEME',
]);

export function isConfiguredSecret(value: string | undefined): boolean {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 && !PLACEHOLDER_VALUES.has(trimmed);
}

export function resolveMediaIngestEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const cmd = env.MEDIA_INGEST_CMD?.trim() || env.MEDIA_INGEST?.trim() || '';
  return cmd.length > 0 ? cmd : null;
}

export function checkBinaryOnPath(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    execFile(checker, [cmd], (err) => {
      resolve(!err);
    });
  });
}

export function getSyncRuntimeConfig(env: NodeJS.ProcessEnv = process.env): Omit<RuntimeCapabilities, 'mediaIngest'> & {
  mediaIngestEnvCommand: string | null;
} {
  const databaseUrlConfigured = isConfiguredSecret(env.DATABASE_URL);
  const bucket = env.S3_BUCKET?.trim() || null;
  const endpoint = env.S3_ENDPOINT?.trim() || null;
  const s3Configured = Boolean(bucket && endpoint);
  const mediaIngestEnvCommand = resolveMediaIngestEnv(env);

  return {
    database: {
      activeDriver: 'sqlite',
      databaseUrlConfigured,
      note: databaseUrlConfigured
        ? 'DATABASE_URL is set; active runtime uses local SQLite (./storage/clipforge.db) and db/schema.sql provides the PostgreSQL schema.'
        : 'Using local SQLite (./storage/clipforge.db) with zero external database setup.',
    },
    storage: {
      activeDriver: 'local',
      s3Configured,
      bucket,
      endpoint,
      note: s3Configured
        ? 'S3 settings detected; local filesystem storage (./storage) remains active for zero-dependency video rendering.'
        : 'Using local filesystem storage (./storage) with zero cloud bucket setup.',
    },
    mediaIngestEnvCommand,
    ai: {
      geminiConfigured: isConfiguredSecret(env.GEMINI_API_KEY),
    },
  };
}

export async function detectRuntimeCapabilities(
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeCapabilities> {
  const syncCfg = getSyncRuntimeConfig(env);
  let mediaIngest: RuntimeCapabilities['mediaIngest'];

  if (syncCfg.mediaIngestEnvCommand) {
    mediaIngest = {
      enabled: true,
      source: 'env',
      command: syncCfg.mediaIngestEnvCommand,
    };
  } else if (await checkBinaryOnPath('yt-dlp')) {
    mediaIngest = {
      enabled: true,
      source: 'yt-dlp',
      command: 'yt-dlp',
    };
  } else {
    mediaIngest = {
      enabled: false,
      source: 'disabled',
      command: null,
    };
  }

  return {
    database: syncCfg.database,
    storage: syncCfg.storage,
    mediaIngest,
    ai: syncCfg.ai,
  };
}
