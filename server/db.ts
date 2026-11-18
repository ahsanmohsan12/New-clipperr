import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  CaptionStyleId,
  Clip,
  ClipStatus,
  MusicTrackId,
  ProcessingStage,
  Project,
  ProjectStatus,
  SourcePlatform,
  StageStatus,
  TranscriptSegment,
} from '../src/shared/types.ts';
import { PIPELINE_STAGE_DEFINITIONS } from '../src/shared/validation.ts';

export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
export const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
export const CLIPS_DIR = path.join(STORAGE_ROOT, 'clips');
export const THUMBS_DIR = path.join(STORAGE_ROOT, 'thumbnails');
export const TEMP_DIR = path.join(STORAGE_ROOT, 'temp');
export const ASSETS_DIR = path.join(STORAGE_ROOT, 'assets');
export const SAMPLES_DIR = path.join(STORAGE_ROOT, 'samples');

for (const dir of [
  STORAGE_ROOT,
  UPLOADS_DIR,
  CLIPS_DIR,
  THUMBS_DIR,
  TEMP_DIR,
  ASSETS_DIR,
  SAMPLES_DIR,
]) {
  fs.mkdirSync(dir, { recursive: true });
}

const DB_PATH = path.join(STORAGE_ROOT, 'clipforge.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    source_path TEXT,
    platform TEXT NOT NULL DEFAULT 'upload',
    thumbnail_url TEXT,
    duration_sec REAL NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1920,
    height INTEGER NOT NULL DEFAULT 1080,
    status TEXT NOT NULL DEFAULT 'created',
    current_stage INTEGER NOT NULL DEFAULT 0,
    progress_pct INTEGER NOT NULL DEFAULT 0,
    eta_seconds INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    transcript_json TEXT,
    scene_timestamps_json TEXT,
    crop_center_ratio REAL NOT NULL DEFAULT 0.5,
    caption_style TEXT NOT NULL DEFAULT 'dynamic_pop',
    fps INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processing_stages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_index INTEGER NOT NULL,
    stage_key TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    UNIQUE(project_id, stage_index)
  );

  CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    subtitles_json TEXT NOT NULL DEFAULT '[]',
    file_path TEXT,
    thumbnail_path TEXT,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1080,
    height INTEGER NOT NULL DEFAULT 1920,
    fps INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export interface ProjectRow {
  id: string;
  title: string;
  source_type: 'url' | 'upload' | 'sample';
  source_url: string | null;
  source_path: string | null;
  platform: SourcePlatform;
  thumbnail_url: string | null;
  duration_sec: number;
  width: number;
  height: number;
  status: ProjectStatus;
  current_stage: number;
  progress_pct: number;
  eta_seconds: number;
  error_message: string | null;
  transcript_json: string | null;
  scene_timestamps_json: string | null;
  crop_center_ratio: number;
  caption_style: CaptionStyleId;
  fps: number;
  created_at: string;
  updated_at: string;
}

interface StageRow {
  id: string;
  project_id: string;
  stage_index: number;
  stage_key: string;
  title: string;
  subtitle: string;
  status: StageStatus;
  error_message: string | null;
}

export interface ClipRow {
  id: string;
  project_id: string;
  title: string;
  hook_text: string;
  viral_score: number;
  hook_delay_label: string;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  caption_style: CaptionStyleId;
  caption_color: string;
  caption_font: string;
  crop_x_offset: number;
  music_track: MusicTrackId;
  speech_volume: number;
  music_volume: number;
  subtitles_json: string;
  file_path: string | null;
  thumbnail_path: string | null;
  file_size_bytes: number;
  width: number;
  height: number;
  fps: number;
  status: ClipStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function mapClipRow(row: ClipRow): Clip {
  let subtitles: TranscriptSegment[] = [];
  try {
    subtitles = JSON.parse(row.subtitles_json || '[]');
  } catch {
    subtitles = [];
  }
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    hookText: row.hook_text,
    viralScore: row.viral_score,
    hookDelayLabel: row.hook_delay_label,
    startSec: row.start_sec,
    endSec: row.end_sec,
    durationSec: row.duration_sec,
    captionStyle: row.caption_style,
    captionColor: row.caption_color,
    captionFont: row.caption_font,
    cropXOffset: row.crop_x_offset,
    musicTrack: row.music_track,
    speechVolume: row.speech_volume,
    musicVolume: row.music_volume,
    subtitles,
    fileSizeBytes: row.file_size_bytes,
    width: row.width,
    height: row.height,
    fps: row.fps,
    status: row.status,
    errorMessage: row.error_message,
    streamUrl: `/api/clips/${row.id}/stream?v=${encodeURIComponent(row.updated_at)}`,
    downloadUrl: `/api/clips/${row.id}/download`,
    thumbnailUrl: row.thumbnail_path ? `/api/thumbnails/${path.basename(row.thumbnail_path)}` : null,
    createdAt: row.created_at,
  };
}

function mapStageRow(row: StageRow): ProcessingStage {
  return {
    stageIndex: row.stage_index,
    stageKey: row.stage_key,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    errorMessage: row.error_message,
  };
}

export function createProjectRecord(input: {
  id: string;
  title: string;
  sourceType: 'url' | 'upload' | 'sample';
  sourceUrl?: string | null;
  sourcePath?: string | null;
  platform: SourcePlatform;
  thumbnailUrl?: string | null;
  durationSec?: number;
  width?: number;
  height?: number;
  captionStyle?: CaptionStyleId;
  fps?: number;
}): Project {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (
      id, title, source_type, source_url, source_path, platform, thumbnail_url,
      duration_sec, width, height, status, current_stage, progress_pct, eta_seconds,
      caption_style, fps, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', 0, 0, 0, ?, ?, ?, ?)
  `).run(
    input.id,
    input.title,
    input.sourceType,
    input.sourceUrl ?? null,
    input.sourcePath ?? null,
    input.platform,
    input.thumbnailUrl ?? null,
    input.durationSec ?? 0,
    input.width ?? 1920,
    input.height ?? 1080,
    input.captionStyle ?? 'dynamic_pop',
    input.fps ?? 30,
    now,
    now,
  );

  const insertStage = db.prepare(`
    INSERT INTO processing_stages (id, project_id, stage_index, stage_key, title, subtitle, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  for (const def of PIPELINE_STAGE_DEFINITIONS) {
    insertStage.run(
      `${input.id}_stage_${def.stageIndex}`,
      input.id,
      def.stageIndex,
      def.stageKey,
      def.title,
      def.defaultSubtitle,
    );
  }

  return getProjectById(input.id)!;
}

export function getProjectRow(projectId: string): ProjectRow | undefined {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectRow | undefined;
}

export function getProjectById(projectId: string): Project | null {
  const row = getProjectRow(projectId);
  if (!row) return null;

  const stageRows = db
    .prepare('SELECT * FROM processing_stages WHERE project_id = ? ORDER BY stage_index ASC')
    .all(projectId) as StageRow[];

  const clipRows = db
    .prepare('SELECT * FROM clips WHERE project_id = ? ORDER BY viral_score DESC, start_sec ASC')
    .all(projectId) as ClipRow[];

  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    platform: row.platform,
    thumbnailUrl: row.thumbnail_url,
    durationSec: row.duration_sec,
    width: row.width,
    height: row.height,
    status: row.status,
    currentStage: row.current_stage,
    progressPct: row.progress_pct,
    etaSeconds: row.eta_seconds,
    errorMessage: row.error_message,
    captionStyle: row.caption_style,
    fps: row.fps,
    stages: stageRows.map(mapStageRow),
    clips: clipRows.map(mapClipRow),
    clipCount: clipRows.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProjects(): Project[] {
  const rows = db.prepare('SELECT id FROM projects ORDER BY created_at DESC LIMIT 30').all() as { id: string }[];
  return rows.map((r) => getProjectById(r.id)).filter((p): p is Project => p !== null);
}

export function updateProjectFields(
  projectId: string,
  fields: Partial<{
    title: string;
    source_path: string | null;
    thumbnail_url: string | null;
    duration_sec: number;
    width: number;
    height: number;
    status: ProjectStatus;
    current_stage: number;
    progress_pct: number;
    eta_seconds: number;
    error_message: string | null;
    transcript_json: string | null;
    scene_timestamps_json: string | null;
    crop_center_ratio: number;
    caption_style: CaptionStyleId;
    fps: number;
  }>,
): void {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  db.prepare(`UPDATE projects SET ${sets}, updated_at = ? WHERE id = ?`).run(
    ...values,
    new Date().toISOString(),
    projectId,
  );
}

export function updateStage(
  projectId: string,
  stageIndex: number,
  status: StageStatus,
  subtitle?: string,
  errorMessage?: string | null,
): void {
  if (subtitle !== undefined) {
    db.prepare(`
      UPDATE processing_stages
      SET status = ?, subtitle = ?, error_message = ?
      WHERE project_id = ? AND stage_index = ?
    `).run(status, subtitle, errorMessage ?? null, projectId, stageIndex);
  } else {
    db.prepare(`
      UPDATE processing_stages
      SET status = ?, error_message = ?
      WHERE project_id = ? AND stage_index = ?
    `).run(status, errorMessage ?? null, projectId, stageIndex);
  }
}

export function resetStagesForReprocess(projectId: string): void {
  for (const def of PIPELINE_STAGE_DEFINITIONS) {
    db.prepare(`
      UPDATE processing_stages
      SET status = 'pending', subtitle = ?, error_message = NULL
      WHERE project_id = ? AND stage_index = ?
    `).run(def.defaultSubtitle, projectId, def.stageIndex);
  }
}

export function upsertClip(clip: {
  id: string;
  projectId: string;
  title: string;
  hookText: string;
  viralScore: number;
  hookDelayLabel: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  captionStyle: CaptionStyleId;
  captionColor: string;
  captionFont: string;
  cropXOffset: number;
  musicTrack: MusicTrackId;
  speechVolume: number;
  musicVolume: number;
  subtitles: TranscriptSegment[];
  filePath?: string | null;
  thumbnailPath?: string | null;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  fps?: number;
  status: ClipStatus;
  errorMessage?: string | null;
}): Clip {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO clips (
      id, project_id, title, hook_text, viral_score, hook_delay_label,
      start_sec, end_sec, duration_sec, caption_style, caption_color, caption_font,
      crop_x_offset, music_track, speech_volume, music_volume, subtitles_json,
      file_path, thumbnail_path, file_size_bytes, width, height, fps, status, error_message,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      hook_text = excluded.hook_text,
      viral_score = excluded.viral_score,
      start_sec = excluded.start_sec,
      end_sec = excluded.end_sec,
      duration_sec = excluded.duration_sec,
      caption_style = excluded.caption_style,
      caption_color = excluded.caption_color,
      caption_font = excluded.caption_font,
      crop_x_offset = excluded.crop_x_offset,
      music_track = excluded.music_track,
      speech_volume = excluded.speech_volume,
      music_volume = excluded.music_volume,
      subtitles_json = excluded.subtitles_json,
      file_path = excluded.file_path,
      thumbnail_path = excluded.thumbnail_path,
      file_size_bytes = excluded.file_size_bytes,
      fps = excluded.fps,
      status = excluded.status,
      error_message = excluded.error_message,
      updated_at = excluded.updated_at
  `).run(
    clip.id,
    clip.projectId,
    clip.title,
    clip.hookText,
    clip.viralScore,
    clip.hookDelayLabel,
    clip.startSec,
    clip.endSec,
    clip.durationSec,
    clip.captionStyle,
    clip.captionColor,
    clip.captionFont,
    clip.cropXOffset,
    clip.musicTrack,
    clip.speechVolume,
    clip.musicVolume,
    JSON.stringify(clip.subtitles),
    clip.filePath ?? null,
    clip.thumbnailPath ?? null,
    clip.fileSizeBytes ?? 0,
    clip.width ?? 1080,
    clip.height ?? 1920,
    clip.fps ?? 30,
    clip.status,
    clip.errorMessage ?? null,
    now,
    now,
  );
  return getClipById(clip.id)!;
}

export function getClipRow(clipId: string): ClipRow | undefined {
  return db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId) as ClipRow | undefined;
}

export function getClipById(clipId: string): Clip | null {
  const row = getClipRow(clipId);
  return row ? mapClipRow(row) : null;
}

export function deleteClipsForProject(projectId: string): void {
  db.prepare('DELETE FROM clips WHERE project_id = ?').run(projectId);
}
