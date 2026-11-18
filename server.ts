import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as archiverPkg from 'archiver';
import type { Archiver, ArchiverOptions } from 'archiver';

const ZipArchiveCtor = (archiverPkg as unknown as {
  ZipArchive: new (options?: ArchiverOptions) => Archiver;
}).ZipArchive;
import type { CaptionStyleId, ClipRegeneratePayload } from './src/shared/types.ts';
import { detectUrlPlatform, SAMPLE_VIDEOS } from './src/shared/validation.ts';
import {
  THUMBS_DIR,
  UPLOADS_DIR,
  createProjectRecord,
  getClipById,
  getClipRow,
  getProjectById,
  getProjectRow,
  listProjects,
} from './server/db.ts';
import { detectRuntimeCapabilities, isConfiguredSecret } from './server/config.ts';
import { inspectVideoUrl } from './server/ingest.ts';
import {
  cancelProjectJob,
  jobEvents,
  regenerateClip,
  startProjectPipeline,
} from './server/pipeline.ts';
import { ensureSampleVideo } from './server/sampleGenerator.ts';
import { generateThumbnail, probeVideo } from './server/videoEngine.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// Configure Multer for direct video file uploads (up to 500MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.mp4') || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okMime =
      file.mimetype.startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.originalname);
    if (!okMime) {
      cb(new Error('Unsupported file format. Upload MP4, MOV, WebM, or MKV video files.'));
    } else {
      cb(null, true);
    }
  },
});

// =============================================================================
// REST API ENDPOINTS
// =============================================================================

app.get('/api/health', async (_req, res) => {
  const capabilities = await detectRuntimeCapabilities();
  res.json({
    ok: true,
    hasGeminiKey: isConfiguredSecret(process.env.GEMINI_API_KEY),
    capabilities,
  });
});

// Serve real sample videos (generated on demand if absent)
app.get('/api/samples/:slug', async (req, res) => {
  try {
    const filePath = await ensureSampleVideo(req.params.slug);
    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to prepare sample video' });
  }
});

// Serve generated thumbnails
app.get('/api/thumbnails/:file', (req, res) => {
  const safeName = path.basename(req.params.file);
  const fullPath = path.join(THUMBS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).end();
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(fullPath).pipe(res);
});

// Inspect URL & extract metadata
app.post('/api/projects/inspect', async (req, res) => {
  try {
    const url = String(req.body?.url || '');
    const result = await inspectVideoUrl(url);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to inspect URL' });
  }
});

// List saved projects
app.get('/api/projects', (_req, res) => {
  res.json({ projects: listProjects() });
});

// Create project from URL or built-in sample
app.post('/api/projects', async (req, res) => {
  try {
    const rawUrl = String(req.body?.url || '').trim();
    const captionStyle = (req.body?.captionStyle || 'dynamic_pop') as CaptionStyleId;
    const fps = Number(req.body?.fps) === 60 ? 60 : 30;

    const detected = detectUrlPlatform(rawUrl);
    if (!detected.valid) {
      return res.status(400).json({ error: detected.error || 'Invalid video URL.' });
    }

    const inspection = await inspectVideoUrl(rawUrl);
    if (!inspection.canDirectIngest) {
      return res.status(422).json({
        error:
          inspection.restrictionReason ||
          'This platform restricts automated downloading. Please upload an authorized MP4 file directly.',
        inspection,
      });
    }

    const projectId = uuidv4();
    const sampleMeta = SAMPLE_VIDEOS.find((s) => detected.normalizedUrl.includes(s.slug));
    const project = createProjectRecord({
      id: projectId,
      title: String(req.body?.title || inspection.title || sampleMeta?.title || 'Untitled Video'),
      sourceType: detected.platform === 'sample' ? 'sample' : 'url',
      sourceUrl: inspection.normalizedUrl,
      platform: detected.platform,
      thumbnailUrl: inspection.thumbnailUrl,
      durationSec: inspection.durationSec ?? 0,
      captionStyle,
      fps,
    });

    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create project' });
  }
});

// Upload direct video file
app.post('/api/projects/upload', (req, res) => {
  upload.single('video')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded.' });
    }

    const filePath = req.file.path;
    try {
      const probe = await probeVideo(filePath);
      const projectId = uuidv4();
      const thumbName = `${projectId}_upload.jpg`;
      const thumbPath = path.join(THUMBS_DIR, thumbName);
      await generateThumbnail(filePath, thumbPath, Math.min(1.0, probe.durationSec / 2));

      const cleanTitle =
        String(req.body?.title || '').trim() ||
        path.basename(req.file.originalname, path.extname(req.file.originalname)).replace(/[-_]+/g, ' ');
      const captionStyle = (req.body?.captionStyle || 'dynamic_pop') as CaptionStyleId;
      const fps = Number(req.body?.fps) === 60 ? 60 : 30;

      const project = createProjectRecord({
        id: projectId,
        title: cleanTitle || 'Uploaded Video',
        sourceType: 'upload',
        sourcePath: filePath,
        platform: 'upload',
        thumbnailUrl: `/api/thumbnails/${thumbName}`,
        durationSec: probe.durationSec,
        width: probe.width,
        height: probe.height,
        captionStyle,
        fps,
      });

      res.status(201).json({ project });
    } catch (err) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid or unreadable video file.',
      });
    }
  });
});

// Start processing job
app.post('/api/projects/:id/process', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  startProjectPipeline(project.id);
  res.json({ project: getProjectById(project.id) });
});

// Cancel processing job
app.post('/api/projects/:id/cancel', (req, res) => {
  const updated = cancelProjectJob(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  res.json({ project: updated });
});

// Get live project status
app.get('/api/projects/:id/status', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  res.json({ project });
});

// SSE stream for real-time progress
app.get('/api/projects/:id/events', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send(project);

  const listener = (updated: unknown) => {
    send(updated);
  };
  jobEvents.on(`project:${req.params.id}`, listener);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    jobEvents.off(`project:${req.params.id}`, listener);
  });
});

// Get clips for project
app.get('/api/projects/:id/clips', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  res.json({ project, clips: project.clips });
});

// Get single clip
app.get('/api/clips/:id', (req, res) => {
  const clip = getClipById(req.params.id);
  if (!clip) {
    return res.status(404).json({ error: 'Clip not found.' });
  }
  const projectRow = getProjectRow(clip.projectId);
  res.json({
    clip,
    sourceDurationSec: projectRow?.duration_sec ?? clip.endSec,
  });
});

// Range-capable MP4 streaming for video preview player
app.get('/api/clips/:id/stream', (req, res) => {
  const row = getClipRow(req.params.id);
  if (!row || !row.file_path || !fs.existsSync(row.file_path)) {
    return res.status(404).json({ error: 'Rendered video file not found.' });
  }

  const stat = fs.statSync(row.file_path);
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(row.file_path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(row.file_path).pipe(res);
  }
});

// Direct MP4 attachment download (Android Chrome & desktop friendly)
app.get('/api/clips/:id/download', (req, res) => {
  const row = getClipRow(req.params.id);
  if (!row || !row.file_path || !fs.existsSync(row.file_path)) {
    return res.status(404).json({ error: 'Rendered MP4 file not available.' });
  }
  const safeTitle = row.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'clipforge-short';
  const filename = `${safeTitle}-9x16.mp4`;
  const stat = fs.statSync(row.file_path);

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(row.file_path).pipe(res);
});

// Download All (or selected clipIds=?id1,id2) as real ZIP archive
app.get('/api/projects/:id/download-all', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const filterIdsParam = typeof req.query.clipIds === 'string' ? req.query.clipIds : '';
  const filterSet = filterIdsParam
    ? new Set(filterIdsParam.split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  const readyClips = project.clips.filter((c) => {
    if (c.status !== 'ready') return false;
    if (filterSet && !filterSet.has(c.id)) return false;
    const row = getClipRow(c.id);
    return Boolean(row?.file_path && fs.existsSync(row.file_path));
  });

  if (readyClips.length === 0) {
    return res.status(400).json({ error: 'No ready MP4 clips available to archive.' });
  }

  const safeProjectName =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'clipforge-shorts';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}-shorts.zip"`);

  const archive = new ZipArchiveCtor({ zlib: { level: 5 } });
  archive.on('error', (err: Error) => {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  });
  archive.pipe(res);

  readyClips.forEach((clip, idx) => {
    const row = getClipRow(clip.id);
    if (row?.file_path && fs.existsSync(row.file_path)) {
      const slug = clip.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `short-${idx + 1}`;
      archive.file(row.file_path, { name: `${String(idx + 1).padStart(2, '0')}-${slug}.mp4` });
    }
  });

  void archive.finalize();
});

// Regenerate / re-render a clip with optional edits
app.post('/api/clips/:id/regenerate', async (req, res) => {
  try {
    const payload = (req.body || {}) as ClipRegeneratePayload;
    const clip = await regenerateClip(req.params.id, payload);
    res.json({ clip });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to regenerate clip' });
  }
});

// =============================================================================
// VITE MIDDLEWARE (DEV) / STATIC DIST (PROD)
// =============================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const capabilities = await detectRuntimeCapabilities();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `ClipForge AI running on http://0.0.0.0:${PORT} ` +
        `[db=${capabilities.database.activeDriver}, storage=${capabilities.storage.activeDriver}, ` +
        `mediaIngest=${capabilities.mediaIngest.source}, gemini=${capabilities.ai.geminiConfigured ? 'configured' : 'not-set'}]`,
    );
  });
}

void startServer();
