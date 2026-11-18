import React from 'react';
import type { CaptionStyleId, Project } from '../shared/types.ts';
import { CAPTION_STYLES, formatDuration } from '../shared/validation.ts';

interface AccountLibraryViewProps {
  projects: Project[];
  defaultCaptionStyle: CaptionStyleId;
  defaultFps: number;
  onChangeDefaultCaptionStyle: (style: CaptionStyleId) => void;
  onChangeDefaultFps: (fps: number) => void;
  onOpenProject: (project: Project) => void;
  onStartNew: () => void;
}

export const AccountLibraryView: React.FC<AccountLibraryViewProps> = ({
  projects,
  defaultCaptionStyle,
  defaultFps,
  onChangeDefaultCaptionStyle,
  onChangeDefaultFps,
  onOpenProject,
  onStartNew,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-24 md:pb-12 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] sm:text-[28px] font-bold text-[#e1e1ef]">
            Library &amp; Export Presets
          </h1>
          <p className="text-[13px] text-[#cbc3d7]">
            Return to saved projects or configure default caption and export preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#a078ff] to-[#03b5d3] text-[#001f26] font-semibold text-[13px] flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>New Video Project</span>
        </button>
      </div>

      {/* Default Export Preferences */}
      <section className="rounded-2xl bg-[#1d1f29] border border-white/[0.06] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4cd7f6] text-[20px]">tune</span>
          <h2 className="text-[15px] font-semibold text-[#e1e1ef]">Default Export Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="default-caption-style" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1.5">
              Default Caption Style
            </label>
            <select
              id="default-caption-style"
              value={defaultCaptionStyle}
              onChange={(e) => onChangeDefaultCaptionStyle(e.target.value as CaptionStyleId)}
              className="w-full h-11 px-3 rounded-xl bg-[#0c0e17] border border-white/[0.08] text-[13px] text-[#e1e1ef]"
            >
              {CAPTION_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[12px] font-semibold text-[#cbc3d7] mb-1.5">
              Render Frame Rate (1080×1920 H.264)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[30, 60].map((fpsVal) => (
                <button
                  key={fpsVal}
                  type="button"
                  onClick={() => onChangeDefaultFps(fpsVal)}
                  className={`h-11 rounded-xl text-[13px] font-semibold border transition-colors ${
                    defaultFps === fpsVal
                      ? 'bg-[#32343e] text-[#4cd7f6] border-[#4cd7f6]/50'
                      : 'bg-[#0c0e17] text-[#cbc3d7] border-white/[0.08] hover:text-[#e1e1ef]'
                  }`}
                >
                  {fpsVal} FPS
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Saved Projects List */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-[#e1e1ef]">
          Saved Projects ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="rounded-2xl bg-[#1d1f29] border border-white/[0.06] p-8 text-center">
            <span className="material-symbols-outlined text-[36px] text-[#958ea0] mb-2">
              video_library
            </span>
            <p className="text-[14px] font-semibold text-[#e1e1ef]">No projects created yet</p>
            <p className="text-[12px] text-[#cbc3d7] mt-1">
              Paste a video URL or upload an MP4 in Studio to generate your first batch of Shorts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-[#1d1f29] border border-white/[0.06] p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="w-16 h-12 rounded-xl object-cover bg-[#0c0e17] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-xl bg-[#282933] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#4cd7f6]">movie</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-[#e1e1ef] truncate">
                      {p.title}
                    </h3>
                    <p className="text-[12px] text-[#cbc3d7] tabular-nums">
                      {p.status === 'completed'
                        ? `${p.clipCount} Shorts ready`
                        : p.status === 'processing'
                          ? `Processing (${p.progressPct}%)`
                          : p.status}
                      {p.durationSec > 0 ? ` · ${formatDuration(p.durationSec)}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(p)}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#282933] hover:bg-[#373943] text-[#4cd7f6] text-[12px] font-semibold shrink-0"
                >
                  {p.status === 'processing' ? 'Monitor' : 'Open'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
