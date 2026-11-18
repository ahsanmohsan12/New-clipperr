import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  Clip,
  ClipRegeneratePayload,
  Project,
  TranscriptSegment,
} from '../src/shared/types.ts';
import { clampClipRange, sliceTranscriptForClip } from '../src/shared/validation.ts';
import {
  CLIPS_DIR,
  TEMP_DIR,
  THUMBS_DIR,
  deleteClipsForProject,
  getClipRow,
  getProjectById,
  getProjectRow,
  resetStagesForReprocess,
  updateProjectFields,
  updateStage,
  upsertClip,
} from './db.ts';
import { acquireSourceVideo } from './ingest.ts';
import { analyzeTranscriptAndDetectClips, transcribeAudioWithGemini } from './providers/aiProvider.ts';
import {
  detectScenesAndCropCenter,
  extractAudioForAi,
  generateThumbnail,
  probeVideo,
  renderShortClip,
} from './videoEngine.ts';

export const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(100);

const activeRuns = new Set<string>();
const cancelledJobs = new Set<string>();

function emitProjectUpdate(projectId: string): void {
  const project = getProjectById(projectId);
  if (project) {
    jobEvents.emit(`project:${projectId}`, project);
  }
}

function checkCancelled(projectId: string): void {
  if (cancelledJobs.has(projectId)) {
    throw new Error('JOB_CANCELLED');
  }
}

export function cancelProjectJob(projectId: string): Project | null {
  cancelledJobs.add(projectId);
  const row = getProjectRow(projectId);
  if (!row) return null;
  if (row.status === 'processing' || row.status === 'created') {
    updateProjectFields(projectId, {
      status: 'cancelled',
      eta_seconds: 0,
      error_message: 'Processing cancelled by user.',
    });
    emitProjectUpdate(projectId);
  }
  return getProjectById(projectId);
}

export function startProjectPipeline(projectId: string): void {
  if (activeRuns.has(projectId)) {
    return;
  }
  cancelledJobs.delete(projectId);
  activeRuns.add(projectId);

  void runPipeline(projectId).finally(() => {
    activeRuns.delete(projectId);
    cancelledJobs.delete(projectId);
  });
}

async function runPipeline(projectId: string): Promise<void> {
  const row = getProjectRow(projectId);
  if (!row) return;

  resetStagesForReprocess(projectId);
  deleteClipsForProject(projectId);
  updateProjectFields(projectId, {
    status: 'processing',
    current_stage: 1,
    progress_pct: 4,
    eta_seconds: 55,
    error_message: null,
  });
  emitProjectUpdate(projectId);

  const audioTempPath = path.join(TEMP_DIR, `${projectId}_audio.mp3`);
  let activeStage = 1;

  try {
    // =========================================================================
    // STAGE 1: VIDEO ANALYSIS (Metadata, Thumbnail, Audio Extraction, Scene Detection, Transcription)
    // =========================================================================
    updateStage(projectId, 1, 'processing', 'Extracting video metadata, audio & scene boundaries...');
    emitProjectUpdate(projectId);
    checkCancelled(projectId);

    const sourcePath = await acquireSourceVideo(
      projectId,
      row.source_type,
      row.platform,
      row.source_url,
      row.source_path,
    );
    checkCancelled(projectId);

    const probe = await probeVideo(sourcePath);
    const thumbFilename = `${projectId}_source.jpg`;
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);
    await generateThumbnail(sourcePath, thumbPath, Math.min(1.5, probe.durationSec / 2));

    updateProjectFields(projectId, {
      source_path: sourcePath,
      thumbnail_url: `/api/thumbnails/${thumbFilename}`,
      duration_sec: probe.durationSec,
      width: probe.width,
      height: probe.height,
      progress_pct: 14,
      eta_seconds: 48,
      title:
        row.title === 'Video from URL' && probe.title
          ? probe.title
          : row.title,
    });
    emitProjectUpdate(projectId);

    const { sceneTimestamps, cropCenterRatio } = await detectScenesAndCropCenter(sourcePath);
    checkCancelled(projectId);

    let rawTranscript = '';
    if (probe.hasAudio) {
      updateStage(projectId, 1, 'processing', 'Transcribing spoken audio with Gemini Speech AI...');
      updateProjectFields(projectId, { progress_pct: 20, eta_seconds: 42 });
      emitProjectUpdate(projectId);

      await extractAudioForAi(sourcePath, audioTempPath);
      checkCancelled(projectId);
      rawTranscript = await transcribeAudioWithGemini(audioTempPath, probe.durationSec);
    } else {
      rawTranscript = '';
    }

    updateProjectFields(projectId, {
      scene_timestamps_json: JSON.stringify(sceneTimestamps),
      crop_center_ratio: cropCenterRatio,
      progress_pct: 28,
      eta_seconds: 36,
    });
    updateStage(
      projectId,
      1,
      'completed',
      `Analyzed ${probe.durationSec.toFixed(1)}s (${probe.width}x${probe.height}) · ${sceneTimestamps.length} scene cues`,
    );
    emitProjectUpdate(projectId);

    // =========================================================================
    // STAGE 2: AI VIRAL MOMENT DETECTION
    // =========================================================================
    activeStage = 2;
    checkCancelled(projectId);
    updateStage(projectId, 2, 'processing', 'Scoring viral hooks, emotional peaks & storytelling arcs...');
    updateProjectFields(projectId, { current_stage: 2, progress_pct: 34, eta_seconds: 32 });
    emitProjectUpdate(projectId);

    const latestRow = getProjectRow(projectId)!;
    const analysis = await analyzeTranscriptAndDetectClips({
      rawTranscript,
      durationSec: probe.durationSec,
      sceneTimestamps,
      videoTitle: latestRow.title,
    });
    checkCancelled(projectId);

    updateProjectFields(projectId, {
      transcript_json: JSON.stringify(analysis.transcript),
      progress_pct: 46,
      eta_seconds: 26,
    });

    // Create pending clip records in database immediately so clip count is live!
    const createdClips: Clip[] = [];
    for (const candidate of analysis.clips) {
      const clamped = clampClipRange(candidate.startSec, candidate.endSec, probe.durationSec, 3);
      const clipSegments = sliceTranscriptForClip(
        analysis.transcript,
        clamped.startSec,
        clamped.endSec,
      );
      const clipId = uuidv4();
      const clip = upsertClip({
        id: clipId,
        projectId,
        title: candidate.title,
        hookText: candidate.hookText,
        viralScore: candidate.viralScore,
        hookDelayLabel: candidate.hookDelayLabel,
        startSec: clamped.startSec,
        endSec: clamped.endSec,
        durationSec: Number((clamped.endSec - clamped.startSec).toFixed(2)),
        captionStyle: latestRow.caption_style,
        captionColor: '#4CD7F6',
        captionFont: 'Noto Sans',
        cropXOffset: 0,
        musicTrack: 'upbeat_tech',
        speechVolume: 1.0,
        musicVolume: 0.22,
        subtitles: clipSegments,
        fps: latestRow.fps,
        status: 'pending',
      });
      createdClips.push(clip);
    }

    updateStage(
      projectId,
      2,
      'completed',
      `${createdClips.length} viral clip${createdClips.length === 1 ? '' : 's'} detected`,
    );
    emitProjectUpdate(projectId);

    // =========================================================================
    // STAGES 3 -> 6: 9:16 CROP, CAPTIONS, SOUND DESIGN & FINAL RENDERING
    // =========================================================================
    activeStage = 3;
    updateStage(
      projectId,
      3,
      'processing',
      `Reframing ${createdClips.length} viral clips to 9:16 vertical`,
    );
    updateProjectFields(projectId, { current_stage: 3, progress_pct: 52, eta_seconds: 22 });
    emitProjectUpdate(projectId);

    // Stage 3 prepares framing, Stage 4 builds ASS caption tracks, Stage 5 configures SFX/ducking, Stage 6 encodes MP4s
    const totalClips = createdClips.length;
    for (let i = 0; i < totalClips; i++) {
      checkCancelled(projectId);
      const clip = createdClips[i];

      if (i === 0) {
        updateStage(projectId, 3, 'completed', `9:16 vertical framing locked for ${totalClips} clips`);
        activeStage = 4;
        updateStage(projectId, 4, 'processing', `Synchronizing ${clip.captionStyle.replace('_', ' ')} captions...`);
        updateProjectFields(projectId, { current_stage: 4, progress_pct: 60, eta_seconds: 18 });
        emitProjectUpdate(projectId);
      }

      const clipMp4Path = path.join(CLIPS_DIR, `${clip.id}.mp4`);
      const clipThumbPath = path.join(THUMBS_DIR, `${clip.id}.jpg`);

      upsertClip({
        ...clip,
        status: 'rendering',
      });

      if (i === 0) {
        updateStage(projectId, 4, 'completed', 'Synchronized kinetic subtitles inside safe margins');
        activeStage = 5;
        updateStage(projectId, 5, 'processing', 'Mixing whoosh/impact SFX & ducking background music...');
        updateProjectFields(projectId, { current_stage: 5, progress_pct: 70, eta_seconds: 14 });
        emitProjectUpdate(projectId);
      }

      if (i === 0) {
        updateStage(projectId, 5, 'completed', 'SFX transitions & speech-ducked audio leveled');
        activeStage = 6;
        updateStage(
          projectId,
          6,
          'processing',
          `Rendering clip ${i + 1} of ${totalClips} (1080x1920 H.264)...`,
        );
        updateProjectFields(projectId, { current_stage: 6, progress_pct: 78, eta_seconds: 10 });
        emitProjectUpdate(projectId);
      } else {
        updateStage(
          projectId,
          6,
          'processing',
          `Rendering clip ${i + 1} of ${totalClips} (1080x1920 H.264)...`,
        );
        const pct = Math.min(96, 78 + Math.round(((i + 0.5) / totalClips) * 18));
        updateProjectFields(projectId, { progress_pct: pct, eta_seconds: Math.max(3, (totalClips - i) * 4) });
        emitProjectUpdate(projectId);
      }

      try {
        const rendered = await renderShortClip({
          clipId: clip.id,
          sourcePath,
          sourceHasAudio: probe.hasAudio,
          sourceWidth: probe.width,
          sourceHeight: probe.height,
          startSec: clip.startSec,
          endSec: clip.endSec,
          cropCenterRatio,
          cropXOffset: clip.cropXOffset,
          captionStyle: clip.captionStyle,
          captionColor: clip.captionColor,
          captionFont: clip.captionFont,
          subtitles: clip.subtitles,
          musicTrack: clip.musicTrack,
          speechVolume: clip.speechVolume,
          musicVolume: clip.musicVolume,
          fps: clip.fps,
          outMp4Path: clipMp4Path,
          outThumbPath: clipThumbPath,
        });

        upsertClip({
          ...clip,
          durationSec: rendered.durationSec,
          filePath: clipMp4Path,
          thumbnailPath: clipThumbPath,
          fileSizeBytes: rendered.fileSizeBytes,
          status: 'ready',
          errorMessage: null,
        });
      } catch (clipErr) {
        const errMsg = clipErr instanceof Error ? clipErr.message : String(clipErr);
        upsertClip({
          ...clip,
          status: 'failed',
          errorMessage: errMsg,
        });
      }
      emitProjectUpdate(projectId);
    }

    updateStage(projectId, 6, 'completed', `Rendered ${totalClips} MP4 Shorts (1080x1920)`);
    updateProjectFields(projectId, {
      status: 'completed',
      current_stage: 6,
      progress_pct: 100,
      eta_seconds: 0,
      error_message: null,
    });
    emitProjectUpdate(projectId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'JOB_CANCELLED') {
      updateProjectFields(projectId, {
        status: 'cancelled',
        eta_seconds: 0,
        error_message: 'Processing cancelled by user.',
      });
    } else {
      updateStage(projectId, activeStage, 'failed', message, message);
      updateProjectFields(projectId, {
        status: 'failed',
        eta_seconds: 0,
        error_message: message,
      });
    }
    emitProjectUpdate(projectId);
  } finally {
    try {
      if (fs.existsSync(audioTempPath)) fs.unlinkSync(audioTempPath);
    } catch {
      // ignore
    }
  }
}

export async function regenerateClip(
  clipId: string,
  edits: ClipRegeneratePayload,
): Promise<Clip> {
  const clipRow = getClipRow(clipId);
  if (!clipRow) {
    throw new Error('Clip not found.');
  }
  const projectRow = getProjectRow(clipRow.project_id);
  if (!projectRow || !projectRow.source_path || !fs.existsSync(projectRow.source_path)) {
    throw new Error('Source video file for this clip is no longer available.');
  }

  const probe = await probeVideo(projectRow.source_path);
  const nextRange = clampClipRange(
    edits.startSec ?? clipRow.start_sec,
    edits.endSec ?? clipRow.end_sec,
    probe.durationSec,
    3,
  );

  let nextSubtitles: TranscriptSegment[];
  if (Array.isArray(edits.subtitles) && edits.subtitles.length > 0) {
    nextSubtitles = edits.subtitles;
  } else if (
    edits.startSec !== undefined ||
    edits.endSec !== undefined
  ) {
    const projectTranscript: TranscriptSegment[] = projectRow.transcript_json
      ? JSON.parse(projectRow.transcript_json)
      : [];
    nextSubtitles = sliceTranscriptForClip(projectTranscript, nextRange.startSec, nextRange.endSec);
  } else {
    nextSubtitles = JSON.parse(clipRow.subtitles_json || '[]');
  }

  const nextCaptionStyle = edits.captionStyle ?? clipRow.caption_style;
  const nextCaptionColor = edits.captionColor ?? clipRow.caption_color;
  const nextCaptionFont = edits.captionFont ?? clipRow.caption_font;
  const nextCropOffset = edits.cropXOffset ?? clipRow.crop_x_offset;
  const nextMusicTrack = edits.musicTrack ?? clipRow.music_track;
  const nextSpeechVol = edits.speechVolume ?? clipRow.speech_volume;
  const nextMusicVol = edits.musicVolume ?? clipRow.music_volume;
  const nextFps = edits.fps ?? clipRow.fps;
  const nextTitle = (edits.title ?? clipRow.title).trim() || clipRow.title;

  upsertClip({
    id: clipRow.id,
    projectId: clipRow.project_id,
    title: nextTitle,
    hookText: clipRow.hook_text,
    viralScore: clipRow.viral_score,
    hookDelayLabel: clipRow.hook_delay_label,
    startSec: nextRange.startSec,
    endSec: nextRange.endSec,
    durationSec: Number((nextRange.endSec - nextRange.startSec).toFixed(2)),
    captionStyle: nextCaptionStyle,
    captionColor: nextCaptionColor,
    captionFont: nextCaptionFont,
    cropXOffset: nextCropOffset,
    musicTrack: nextMusicTrack,
    speechVolume: nextSpeechVol,
    musicVolume: nextMusicVol,
    subtitles: nextSubtitles,
    filePath: clipRow.file_path,
    thumbnailPath: clipRow.thumbnail_path,
    fileSizeBytes: clipRow.file_size_bytes,
    fps: nextFps,
    status: 'rendering',
    errorMessage: null,
  });

  const outMp4Path = path.join(CLIPS_DIR, `${clipRow.id}.mp4`);
  const outThumbPath = path.join(THUMBS_DIR, `${clipRow.id}.jpg`);

  try {
    const rendered = await renderShortClip({
      clipId: clipRow.id,
      sourcePath: projectRow.source_path,
      sourceHasAudio: probe.hasAudio,
      sourceWidth: probe.width,
      sourceHeight: probe.height,
      startSec: nextRange.startSec,
      endSec: nextRange.endSec,
      cropCenterRatio: projectRow.crop_center_ratio,
      cropXOffset: nextCropOffset,
      captionStyle: nextCaptionStyle,
      captionColor: nextCaptionColor,
      captionFont: nextCaptionFont,
      subtitles: nextSubtitles,
      musicTrack: nextMusicTrack,
      speechVolume: nextSpeechVol,
      musicVolume: nextMusicVol,
      fps: nextFps,
      outMp4Path,
      outThumbPath,
    });

    const updated = upsertClip({
      id: clipRow.id,
      projectId: clipRow.project_id,
      title: nextTitle,
      hookText: clipRow.hook_text,
      viralScore: clipRow.viral_score,
      hookDelayLabel: clipRow.hook_delay_label,
      startSec: nextRange.startSec,
      endSec: nextRange.endSec,
      durationSec: rendered.durationSec,
      captionStyle: nextCaptionStyle,
      captionColor: nextCaptionColor,
      captionFont: nextCaptionFont,
      cropXOffset: nextCropOffset,
      musicTrack: nextMusicTrack,
      speechVolume: nextSpeechVol,
      musicVolume: nextMusicVol,
      subtitles: nextSubtitles,
      filePath: outMp4Path,
      thumbnailPath: outThumbPath,
      fileSizeBytes: rendered.fileSizeBytes,
      fps: nextFps,
      status: 'ready',
      errorMessage: null,
    });
    emitProjectUpdate(clipRow.project_id);
    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const failed = upsertClip({
      id: clipRow.id,
      projectId: clipRow.project_id,
      title: nextTitle,
      hookText: clipRow.hook_text,
      viralScore: clipRow.viral_score,
      hookDelayLabel: clipRow.hook_delay_label,
      startSec: nextRange.startSec,
      endSec: nextRange.endSec,
      durationSec: Number((nextRange.endSec - nextRange.startSec).toFixed(2)),
      captionStyle: nextCaptionStyle,
      captionColor: nextCaptionColor,
      captionFont: nextCaptionFont,
      cropXOffset: nextCropOffset,
      musicTrack: nextMusicTrack,
      speechVolume: nextSpeechVol,
      musicVolume: nextMusicVol,
      subtitles: nextSubtitles,
      filePath: clipRow.file_path,
      thumbnailPath: clipRow.thumbnail_path,
      fileSizeBytes: clipRow.file_size_bytes,
      fps: nextFps,
      status: 'failed',
      errorMessage: msg,
    });
    emitProjectUpdate(clipRow.project_id);
    return failed;
  }
}
