-- ClipForge AI Production PostgreSQL Schema
-- Used alongside local SQLite persistence for production multi-user deployments.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  default_caption_style TEXT NOT NULL DEFAULT 'dynamic_pop',
  default_fps INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('url', 'upload', 'sample')),
  source_url TEXT,
  source_storage_key TEXT,
  platform TEXT NOT NULL DEFAULT 'upload',
  thumbnail_url TEXT,
  duration_sec REAL NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'completed', 'failed', 'cancelled')),
  current_stage INTEGER NOT NULL DEFAULT 0,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  eta_seconds INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  transcript_json JSONB,
  scene_timestamps_json JSONB,
  crop_center_ratio REAL NOT NULL DEFAULT 0.5,
  caption_style TEXT NOT NULL DEFAULT 'dynamic_pop',
  fps INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL CHECK (stage_index BETWEEN 1 AND 6),
  stage_key TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(project_id, stage_index)
);

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  viral_score INTEGER NOT NULL DEFAULT 85,
  hook_delay_label TEXT NOT NULL DEFAULT 'Hook: 0.8s',
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  duration_sec REAL NOT NULL,
  caption_style TEXT NOT NULL DEFAULT 'dynamic_pop',
  caption_color TEXT NOT NULL DEFAULT '#4CD7F6',
  caption_font TEXT NOT NULL DEFAULT 'Noto Sans',
  crop_x_offset REAL NOT NULL DEFAULT 0,
  music_track TEXT NOT NULL DEFAULT 'upbeat_tech',
  speech_volume REAL NOT NULL DEFAULT 1.0,
  music_volume REAL NOT NULL DEFAULT 0.22,
  subtitles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_key TEXT,
  thumbnail_key TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1920,
  fps INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  download_type TEXT NOT NULL CHECK (download_type IN ('single_mp4', 'batch_zip')),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_project ON clips(project_id, viral_score DESC);
