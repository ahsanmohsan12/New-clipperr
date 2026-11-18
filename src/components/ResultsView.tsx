import React, { useEffect, useMemo, useRef, useState } from 'react';
import { regenerateClipApi, triggerFileDownload } from '../api/client.ts';
import type { CaptionStyleId, Clip, Project } from '../shared/types.ts';
import {
  CAPTION_STYLES,
  formatDuration,
  formatFileSize,
} from '../shared/validation.ts';

interface ResultsViewProps {
  project: Project;
  onCreateMore: () => void;
  onOpenEditor: (clip: Clip) => void;
  onClipUpdated: (clip: Clip) => void;
}

interface ShortCardProps {
  clip: Clip;
  selected: boolean;
  onToggleSelect: (clipId: string) => void;
  onOpenEditor: (clip: Clip) => void;
  onRegenerate: (clip: Clip) => Promise<void>;
  regeneratingId: string | null;
}

const ShortCard: React.FC<ShortCardProps> = ({
  clip,
  selected,
  onToggleSelect,
  onOpenEditor,
  onRegenerate,
  regeneratingId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [copiedHook, setCopiedHook] = useState(false);

  const isBusy = regeneratingId === clip.id || clip.status === 'rendering' || clip.status === 'pending';
  const styleMeta = CAPTION_STYLES.find((s) => s.id === clip.captionStyle);

  const togglePlay = async () => {
    const vid = videoRef.current;
    if (!vid || clip.status !== 'ready') return;
    if (vid.paused) {
      try {
        await vid.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleCopyHook = async () => {
    try {
      await navigator.clipboard.writeText(clip.hookText);
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    if (clip.status !== 'ready') return;
    const safeName = `${clip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'short'}-9x16.mp4`;
    triggerFileDownload(clip.downloadUrl, safeName);
  };

  return (
    <article
      data-testid="clip-card"
      className="flex flex-col bg-[#1d1f29] rounded-3xl p-2.5 shadow-md border border-white/[0.06] transition-all"
    >
      {/* 9:16 Vertical Video Frame */}
      <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#0c0e17] flex items-center justify-center group">
        {clip.status === 'ready' ? (
          <video
            ref={videoRef}
            src={clip.streamUrl}
            poster={clip.thumbnailUrl || undefined}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v && v.duration > 0) {
                setProgressPct((v.currentTime / v.duration) * 100);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setProgressPct(0);
            }}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#191b24]">
            {isBusy ? (
              <>
                <span className="inline-block w-8 h-8 border-2 border-[#4cd7f6] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-[13px] font-semibold text-[#e1e1ef]">Rendering Short...</p>
                <p className="text-[11px] text-[#958ea0] mt-1">Applying captions &amp; sound mix</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[34px] text-[#ffb4ab] mb-2">
                  error
                </span>
                <p className="text-[13px] font-semibold text-[#ffdad6]">Render Failed</p>
                <p className="text-[11px] text-[#cbc3d7] mt-1 line-clamp-3">
                  {clip.errorMessage || 'FFmpeg rendering failed for this segment.'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Subtle Top/Bottom Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e17]/80 via-transparent to-[#0c0e17]/45 pointer-events-none" />

        {/* Top Badges Row */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10">
          <label className="flex items-center gap-1.5 bg-[#0c0e17]/75 backdrop-blur-md px-2.5 py-1 rounded-full cursor-pointer min-h-[32px]">
            <input
              type="checkbox"
              checked={selected}
              disabled={clip.status !== 'ready'}
              onChange={() => onToggleSelect(clip.id)}
              className="w-4 h-4 rounded accent-[#d0bcff] cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-[#e1e1ef]">Selected</span>
          </label>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0c0e17]/80 backdrop-blur-md text-[#4cd7f6] shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-[#4cd7f6]">
              local_fire_department
            </span>
            <span className="text-[11px] font-semibold tracking-wide tabular-nums">
              {clip.viralScore}% Viral
            </span>
          </div>
        </div>

        {/* Center Play / Pause Glassmorphic Button */}
        {clip.status === 'ready' && (
          <button
            type="button"
            aria-label={isPlaying ? `Pause ${clip.title}` : `Play ${clip.title}`}
            onClick={togglePlay}
            className={`relative z-10 w-14 h-14 rounded-full bg-[#1d1f29]/70 backdrop-blur-xl flex items-center justify-center text-[#e1e1ef] shadow-xl hover:scale-105 active:scale-95 transition-all ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            <span
              className="material-symbols-outlined text-[32px] text-[#4cd7f6]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        )}

        {/* Caption Style Tag Bottom Left */}
        <div className="absolute bottom-3 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <span className="px-2 py-0.5 rounded-md bg-[#0c0e17]/75 backdrop-blur-sm text-[10px] font-medium text-[#d0bcff]">
            {styleMeta?.label || clip.captionStyle}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0c0e17]/75 backdrop-blur-sm text-[10px] font-medium text-[#cbc3d7] tabular-nums">
            {formatFileSize(clip.fileSizeBytes)}
          </span>
        </div>

        {/* Progress Scrub Line */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-[#282933]/70 z-10">
          <div
            className="h-full bg-[#4cd7f6] rounded-full shadow-[0_0_8px_#4cd7f6] transition-all duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Card Meta Info */}
      <div className="pt-3 px-1.5 pb-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[#e1e1ef] truncate" title={clip.title}>
              {clip.title}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[#cbc3d7] text-[12px] tabular-nums">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {formatDuration(clip.durationSec)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[11px] font-medium text-[#e1e1ef]">
                {clip.width}×{clip.height} HD
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#4cd7f6] font-medium text-[11px]">
                {clip.hookDelayLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyHook}
            aria-label={`Copy hook text for ${clip.title}`}
            title="Copy Hook Text"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#282933] text-[#cbc3d7] hover:text-[#e1e1ef] active:bg-[#373943] transition-colors shrink-0"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                copiedHook ? 'text-[#4cd7f6]' : ''
              }`}
            >
              {copiedHook ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>

        {/* Action Row */}
        {clip.status === 'failed' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRegenerate(clip)}
            className="w-full min-h-[44px] rounded-xl bg-[#93000a]/50 hover:bg-[#93000a]/75 text-[#ffdad6] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Regenerate Clip</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenEditor(clip)}
              className="min-h-[44px] rounded-xl bg-[#282933] hover:bg-[#373943] text-[#e1e1ef] text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-[#4cd7f6]">tune</span>
              <span>Edit &amp; Preview</span>
            </button>
            <button
              type="button"
              disabled={clip.status !== 'ready'}
              onClick={handleDownload}
              className="min-h-[44px] rounded-xl bg-[#a078ff] hover:bg-[#d0bcff] text-[#23005c] text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#a078ff]/20 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download MP4</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({
  project,
  onCreateMore,
  onOpenEditor,
  onClipUpdated,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(project.clips.filter((c) => c.status === 'ready').map((c) => c.id));
  });
  const [activePreset, setActivePreset] = useState<CaptionStyleId>(project.captionStyle);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(new Set(project.clips.filter((c) => c.status === 'ready').map((c) => c.id)));
  }, [project.id, project.clips.length]);

  const readyClips = useMemo(
    () => project.clips.filter((c) => c.status === 'ready'),
    [project.clips],
  );

  const selectedReadyClips = useMemo(
    () => readyClips.filter((c) => selectedIds.has(c.id)),
    [readyClips, selectedIds],
  );

  const totalSelectedBytes = useMemo(
    () => selectedReadyClips.reduce((acc, c) => acc + (c.fileSizeBytes || 0), 0),
    [selectedReadyClips],
  );

  const toggleSelect = (clipId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });
  };

  const handleDownloadAllZip = () => {
    if (readyClips.length === 0) return;
    triggerFileDownload(
      `/api/projects/${project.id}/download-all`,
      `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'clipforge'}-shorts.zip`,
    );
  };

  const handleDownloadSelected = () => {
    if (selectedReadyClips.length === 0) return;
    if (selectedReadyClips.length === 1) {
      const only = selectedReadyClips[0];
      triggerFileDownload(only.downloadUrl, `${only.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-9x16.mp4`);
      return;
    }
    const idsParam = selectedReadyClips.map((c) => c.id).join(',');
    triggerFileDownload(
      `/api/projects/${project.id}/download-all?clipIds=${encodeURIComponent(idsParam)}`,
      `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'clipforge'}-selected.zip`,
    );
  };

  const handleApplyCaptionPreset = async (styleId: CaptionStyleId) => {
    setActivePreset(styleId);
    const targets = selectedReadyClips.length > 0 ? selectedReadyClips : readyClips;
    if (targets.length === 0) return;

    setApplyingPreset(true);
    setStatusNotice(`Re-rendering ${targets.length} Short${targets.length > 1 ? 's' : ''} with ${CAPTION_STYLES.find((s) => s.id === styleId)?.label} captions...`);
    try {
      for (const clip of targets) {
        setRegeneratingId(clip.id);
        const updated = await regenerateClipApi(clip.id, { captionStyle: styleId });
        onClipUpdated(updated);
      }
      setStatusNotice(null);
    } catch (err) {
      setStatusNotice(err instanceof Error ? err.message : 'Failed to apply caption preset.');
    } finally {
      setRegeneratingId(null);
      setApplyingPreset(false);
    }
  };

  const handleRegenerateSingle = async (clip: Clip) => {
    setRegeneratingId(clip.id);
    try {
      const updated = await regenerateClipApi(clip.id, {});
      onClipUpdated(updated);
    } finally {
      setRegeneratingId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-36 md:pb-24">
      {/* Celebration Header */}
      <div className="relative w-full mb-6">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-56 h-28 bg-[#d0bcff]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 self-start px-3 py-0.5 rounded-full bg-[#282933] text-[#4cd7f6] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>AI Engine Rendering Complete</span>
            </div>
            <h1 className="font-display text-[26px] sm:text-[32px] font-bold text-[#e1e1ef] tracking-tight">
              Your Shorts Are Ready!
            </h1>
            <p className="text-[14px] text-[#cbc3d7]">
              Generated {project.clips.length} high-virality 9:16 Shorts from{' '}
              <span className="text-[#e1e1ef] font-medium">&ldquo;{project.title}&rdquo;</span>
            </p>
          </div>

          {/* Primary Global Action Stack */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={readyClips.length === 0}
              onClick={handleDownloadAllZip}
              className="flex-1 sm:flex-none min-h-[48px] px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#a078ff] via-[#03b5d3] to-[#4cd7f6] text-[#001f26] font-semibold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#a078ff]/25 active:scale-[0.98] transition-transform disabled:opacity-50 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[20px]">folder_zip</span>
              <span>Download All (.ZIP)</span>
            </button>
            <button
              type="button"
              onClick={onCreateMore}
              className="min-h-[48px] px-4 rounded-xl bg-[#1d1f29] hover:bg-[#282933] border border-white/[0.08] text-[#e1e1ef] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">Create More Shorts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Caption Preset Picker */}
      <section className="w-full mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">subtitles</span>
            <span className="text-[13px] font-semibold text-[#e1e1ef]">
              Caption Style Preset
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#03b5d3]">
            {applyingPreset ? 'Re-rendering MP4s...' : 'Click to re-render style'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CAPTION_STYLES.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={applyingPreset}
                onClick={() => handleApplyCaptionPreset(preset.id)}
                className={`flex-shrink-0 flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#32343e] text-[#e1e1ef] ring-1 ring-[#d0bcff]/50 shadow-sm'
                    : 'bg-[#1d1f29] text-[#cbc3d7] hover:text-[#e1e1ef] hover:bg-[#282933]'
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-[#4cd7f6] shadow-[0_0_8px_#4cd7f6]" />
                )}
                <span className={isActive ? 'font-semibold text-[#d0bcff]' : ''}>
                  {preset.label}
                </span>
                {preset.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#d0bcff]/20 text-[#e9ddff] uppercase tracking-wider font-bold">
                    {preset.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {statusNotice && (
          <div className="mt-2 rounded-xl bg-[#191b24] border border-[#4cd7f6]/30 px-3.5 py-2 flex items-center gap-2 text-[12px] text-[#4cd7f6]">
            {applyingPreset && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-[#4cd7f6] border-t-transparent rounded-full animate-spin" />
            )}
            <span>{statusNotice}</span>
          </div>
        )}
      </section>

      {/* Video Cards Grid */}
      {project.clips.length === 0 ? (
        <div className="rounded-2xl bg-[#1d1f29] p-8 text-center border border-white/[0.06]">
          <p className="text-[15px] font-semibold text-[#e1e1ef]">No clips generated yet</p>
          <p className="text-[13px] text-[#cbc3d7] mt-1">
            Return to Studio to process a video into Shorts.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {project.clips.map((clip) => (
            <ShortCard
              key={clip.id}
              clip={clip}
              selected={selectedIds.has(clip.id)}
              onToggleSelect={toggleSelect}
              onOpenEditor={onOpenEditor}
              onRegenerate={handleRegenerateSingle}
              regeneratingId={regeneratingId}
            />
          ))}
        </section>
      )}

      {/* Smart Export Settings Info Box */}
      <section className="mt-8 p-4 rounded-2xl bg-[#191b24] border border-white/[0.06] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4cd7f6] text-[20px]">tune</span>
            <span className="text-[13px] font-semibold text-[#e1e1ef]">Smart Export Pipeline</span>
          </div>
          <span className="text-[11px] text-[#cbc3d7] tabular-nums">
            1080×1920 · {project.fps} FPS · H.264 / AAC
          </span>
        </div>
        <p className="text-[12px] text-[#cbc3d7]">
          Rendered with automatic 9:16 speaker framing, synchronized ASS animated subtitles, transition SFX, and speech-ducked background music.
        </p>
      </section>

      {/* Sticky Quick Summary & Batch Download Bar */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 px-4 md:px-6 py-3 bg-[#0c0e17]/92 backdrop-blur-xl border-t border-white/[0.08] shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4cd7f6]" />
              <span className="text-[13px] font-semibold text-[#e1e1ef] tabular-nums">
                {selectedReadyClips.length} of {readyClips.length} selected
              </span>
            </div>
            <span className="text-[12px] text-[#cbc3d7] truncate tabular-nums">
              {formatFileSize(totalSelectedBytes)} total · MP4 / ZIP ready
            </span>
          </div>
          <button
            type="button"
            disabled={selectedReadyClips.length === 0}
            onClick={handleDownloadSelected}
            className="min-h-[46px] px-5 rounded-xl bg-gradient-to-r from-[#a078ff] to-[#03b5d3] text-[#001f26] font-semibold text-[14px] flex items-center justify-center gap-2 shadow-md shadow-[#d0bcff]/20 active:scale-95 transition-transform shrink-0 disabled:opacity-45"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Download Selected</span>
          </button>
        </div>
      </div>
    </div>
  );
};
