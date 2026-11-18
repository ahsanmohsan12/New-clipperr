import React, { useEffect, useRef, useState } from 'react';
import {
  createProjectFromUrl,
  inspectUrl,
  startProjectProcessing,
  uploadVideoProject,
} from '../api/client.ts';
import type { CaptionStyleId, Project, UrlInspectionResult } from '../shared/types.ts';
import {
  SAMPLE_VIDEOS,
  detectUrlPlatform,
  formatDuration,
  formatFileSize,
} from '../shared/validation.ts';

interface StudioViewProps {
  defaultCaptionStyle: CaptionStyleId;
  defaultFps: number;
  onProjectStarted: (project: Project) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  defaultCaptionStyle,
  defaultFps,
  onProjectStarted,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileDurationSec, setFileDurationSec] = useState<number | null>(null);
  const [inspection, setInspection] = useState<UrlInspectionResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up local object URL when file changes
  useEffect(() => {
    if (!selectedFile) {
      setFilePreviewUrl(null);
      setFileDurationSec(null);
      return;
    }
    const objUrl = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(objUrl);

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.src = objUrl;
    videoEl.onloadedmetadata = () => {
      if (Number.isFinite(videoEl.duration)) {
        setFileDurationSec(Math.round(videoEl.duration));
      }
    };

    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [selectedFile]);

  // Debounced real metadata extraction when URL changes
  useEffect(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setInspection(null);
      return;
    }

    const check = detectUrlPlatform(trimmed);
    if (!check.valid) {
      setInspection(null);
      return;
    }

    const timer = setTimeout(async () => {
      setInspecting(true);
      try {
        const res = await inspectUrl(trimmed);
        setInspection(res);
      } catch {
        setInspection(null);
      } finally {
        setInspecting(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [urlInput]);

  const handlePaste = async () => {
    setErrorMsg(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSelectedFile(null);
          setUrlInput(text.trim());
          return;
        }
      }
    } catch {
      // Clipboard permission denied — focus input instead
    }
    const el = document.getElementById('video-url-input') as HTMLInputElement | null;
    el?.focus();
  };

  const handleSelectSample = (samplePath: string) => {
    setErrorMsg(null);
    setSelectedFile(null);
    setUrlInput(samplePath);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setUrlInput('');
    setInspection(null);
    setSelectedFile(file);
  };

  const handleStartCreating = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!selectedFile && !urlInput.trim()) {
      setErrorMsg('Please paste a supported video URL, select a sample, or upload an MP4/MOV video file.');
      return;
    }

    setSubmitting(true);
    try {
      let project: Project;

      if (selectedFile) {
        setUploadProgress(0);
        project = await uploadVideoProject({
          file: selectedFile,
          captionStyle: defaultCaptionStyle,
          fps: defaultFps,
          onProgress: (pct) => setUploadProgress(pct),
        });
      } else {
        const check = detectUrlPlatform(urlInput);
        if (!check.valid) {
          setErrorMsg(check.error || 'Please enter a valid video URL.');
          setSubmitting(false);
          return;
        }
        project = await createProjectFromUrl({
          url: urlInput.trim(),
          title: inspection?.title || undefined,
          captionStyle: defaultCaptionStyle,
          fps: defaultFps,
        });
      }

      const started = await startProjectProcessing(project.id);
      onProjectStarted(started);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start video processing.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-24 md:pb-12">
      {/* Status Chip */}
      <div className="flex justify-center lg:justify-start mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#282933]/75 backdrop-blur-md shadow-sm border border-white/[0.06]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#4cd7f6] shadow-[0_0_8px_#4cd7f6]" />
          <span className="text-[11px] font-semibold text-[#cbc3d7] tracking-wide">
            AI Video Engine · 1 Video → Viral 9:16 Shorts
          </span>
        </div>
      </div>

      {/* Main Responsive 2-Column Layout on Desktop, Stacked on Mobile (matching Stitch) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Hero Copy + Ingestion Card + Supported Platforms */}
        <div className="lg:col-span-7 flex flex-col">
          {/* Hero Header Typography */}
          <div className="text-center lg:text-left px-1 mb-6">
            <h1 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] leading-[1.15] font-bold tracking-[-0.025em] text-[#e1e1ef] text-balance">
              Turn Any Video Into{' '}
              <span className="bg-gradient-to-r from-[#4cd7f6] via-[#d0bcff] to-[#a078ff] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(208,188,255,0.35)]">
                Viral Shorts
              </span>
            </h1>
            <p className="text-[14px] sm:text-[16px] text-[#cbc3d7] mt-2.5 max-w-md mx-auto lg:mx-0">
              Paste a video link or upload an MP4. Let AI automatically detect hooks, crop 9:16, add captions, and render Shorts.
            </p>
          </div>

          {/* Main Hero Card: URL & Upload Ingestion Module */}
          <form
            onSubmit={handleStartCreating}
            className="relative w-full rounded-2xl bg-[#1d1f29]/90 backdrop-blur-xl p-4 sm:p-5 shadow-[0_16px_40px_-10px_rgba(12,14,23,0.85),0_0_0_1px_rgba(255,255,255,0.07)] overflow-hidden"
          >
            {/* Ambient Luminous Glow Underlay */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#d0bcff]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#4cd7f6]/15 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col gap-3.5">
              {/* URL Ingestion Field */}
              <label htmlFor="video-url-input" className="sr-only">
                Video URL
              </label>
              <div
                className={`relative flex items-center bg-[#0c0e17]/95 rounded-xl px-3 py-1 border transition-colors ${
                  errorMsg
                    ? 'border-[#ffb4ab]/60'
                    : 'border-white/[0.06] focus-within:border-[#4cd7f6]/60'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[#ffb4ab] text-[22px] ml-0.5 mr-2 select-none"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_display
                </span>
                <input
                  id="video-url-input"
                  type="text"
                  inputMode="url"
                  value={urlInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setSelectedFile(null);
                    setUrlInput(e.target.value);
                  }}
                  placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
                  className="w-full bg-transparent py-3 text-[13px] sm:text-[14px] text-[#e1e1ef] placeholder:text-[#958ea0] focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  aria-label="Paste URL from clipboard"
                  className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-[#282933] hover:bg-[#373943] text-[#4cd7f6] text-[11px] font-semibold transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[15px]">content_paste</span>
                  <span>Paste</span>
                </button>
              </div>

              {/* Direct Video Upload Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload local video file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#191b24] hover:bg-[#282933] border border-white/[0.08] text-[12px] font-medium text-[#e1e1ef] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d0bcff]">
                    upload_file
                  </span>
                  <span>{selectedFile ? 'Change Video File' : 'Or Upload Video File (MP4 / MOV / WebM)'}</span>
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-[11px] text-[#cbc3d7] hover:text-[#ffb4ab] underline px-2 py-1"
                  >
                    Clear file
                  </button>
                )}
              </div>

              {/* Extracted Metadata Preview Card (from URL inspection or File Upload) */}
              {(inspecting || inspection || selectedFile) && (
                <div className="rounded-xl bg-[#191b24] border border-white/[0.07] p-3 flex items-center gap-3">
                  {inspection?.thumbnailUrl ? (
                    <img
                      src={inspection.thumbnailUrl}
                      alt={inspection.title}
                      className="w-20 h-12 rounded-lg object-cover shrink-0 bg-[#0c0e17]"
                    />
                  ) : filePreviewUrl ? (
                    <video
                      src={filePreviewUrl}
                      muted
                      playsInline
                      className="w-20 h-12 rounded-lg object-cover shrink-0 bg-[#0c0e17]"
                    />
                  ) : (
                    <div className="w-20 h-12 rounded-lg bg-[#282933] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#4cd7f6] text-[22px]">
                        movie
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {inspecting ? (
                      <p className="text-[12px] text-[#cbc3d7]">Inspecting video metadata...</p>
                    ) : selectedFile ? (
                      <>
                        <p className="text-[13px] font-semibold text-[#e1e1ef] truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-[#cbc3d7] tabular-nums">
                          Local Upload · {formatFileSize(selectedFile.size)}
                          {fileDurationSec ? ` · ${formatDuration(fileDurationSec)}` : ''}
                        </p>
                      </>
                    ) : inspection ? (
                      <>
                        <p className="text-[13px] font-semibold text-[#e1e1ef] truncate">
                          {inspection.title}
                        </p>
                        <p className="text-[11px] text-[#cbc3d7] tabular-nums">
                          {inspection.platform.toUpperCase()}
                          {inspection.durationSec ? ` · ${formatDuration(inspection.durationSec)}` : ''}
                          {inspection.canDirectIngest ? ' · Ready for AI Processing' : ''}
                        </p>
                        {!inspection.canDirectIngest && inspection.restrictionReason && (
                          <p className="text-[11px] text-[#ffb4ab] mt-1 leading-snug">
                            {inspection.restrictionReason}
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Quick Preset Sample Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-semibold text-[#958ea0] shrink-0">
                  Try sample:
                </span>
                {SAMPLE_VIDEOS.map((sample, idx) => (
                  <button
                    key={sample.slug}
                    type="button"
                    onClick={() => handleSelectSample(sample.samplePath)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full text-[11px] font-medium transition-colors active:scale-95 ${
                      urlInput === sample.samplePath
                        ? 'bg-[#282933] text-[#4cd7f6] ring-1 ring-[#4cd7f6]/50'
                        : 'bg-[#282933]/65 hover:bg-[#282933] text-[#cbc3d7] hover:text-[#e1e1ef]'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[14px] ${
                        idx === 0 ? 'text-[#4cd7f6]' : 'text-[#d0bcff]'
                      }`}
                    >
                      {idx === 0 ? 'bolt' : 'play_circle'}
                    </span>
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>

              {/* Validation / API Error Message */}
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/30 px-3.5 py-2.5 flex items-start gap-2 text-[12px] text-[#ffdad6]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ffb4ab] shrink-0">
                    error
                  </span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Forge CTA Button */}
              <button
                type="submit"
                disabled={submitting}
                className="relative group w-full h-14 rounded-xl bg-gradient-to-r from-[#03b5d3] via-[#a078ff] to-[#6d3bd7] text-[#0c0e17] font-semibold text-[16px] flex items-center justify-center gap-2 shadow-[0_0_24px_-4px_rgba(76,215,246,0.4),0_8px_16px_-4px_rgba(160,120,255,0.35)] hover:shadow-[0_0_30px_rgba(76,215,246,0.55)] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-75"
              >
                {submitting ? (
                  <span className="relative z-10 flex items-center gap-2.5 text-white">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {uploadProgress !== null
                        ? `Uploading Video (${uploadProgress}%)...`
                        : 'Creating Job & Starting AI...'}
                    </span>
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2 text-white">
                    <span>Start Creating</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </span>
                )}
              </button>

              {/* Processing Micro-Notice */}
              <div className="flex items-center justify-center gap-1.5 text-center">
                <span className="material-symbols-outlined text-[15px] text-[#4cd7f6]">
                  verified
                </span>
                <span className="text-[12px] text-[#958ea0]">
                  Only process videos you own or are authorized to edit
                </span>
              </div>
            </div>
          </form>

          {/* Supported Platforms Footer Bar (Desktop inline) */}
          <div className="hidden lg:flex mt-6 w-full flex-col items-start gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#958ea0]">
              Supports Direct Ingestion &amp; Authorized Sources
            </span>
            <div className="w-full flex items-center justify-around py-2.5 px-3 rounded-xl bg-[#0c0e17]/70 border border-white/[0.05]">
              <div className="flex items-center gap-1.5 text-[#cbc3d7]">
                <span className="material-symbols-outlined text-[18px] text-[#ffb4ab]">
                  smart_display
                </span>
                <span className="text-[12px] font-medium">YouTube</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#cbc3d7]">
                <span className="material-symbols-outlined text-[18px] text-[#4cd7f6]">
                  music_note
                </span>
                <span className="text-[12px] font-medium">TikTok</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#cbc3d7]">
                <span className="material-symbols-outlined text-[18px] text-[#d0bcff]">tv</span>
                <span className="text-[12px] font-medium">Twitch</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#cbc3d7]">
                <span className="material-symbols-outlined text-[18px] text-[#adc6ff]">
                  audio_file
                </span>
                <span className="text-[12px] font-medium">MP4 / MOV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Perspective Floating Preview Simulation (Stitch visual centerpiece) */}
        <div className="lg:col-span-5 relative w-full flex justify-center items-center py-6 select-none">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 bg-[#d0bcff]/12 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            {/* Phone Simulator Shell */}
            <div className="relative w-[224px] sm:w-[244px] aspect-[9/16] rounded-3xl bg-[#0c0e17] p-2 shadow-[0_24px_54px_-12px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.08)] rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#282933] flex flex-col justify-between p-3">
                <img
                  src="/src/assets/images/studio_host_preview_1794995441184.jpg"
                  alt="9:16 vertical short preview frame"
                  className="absolute inset-0 w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e17]/90 via-transparent to-[#0c0e17]/40 pointer-events-none" />

                {/* Top Overlay Info */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0c0e17]/80 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[#4cd7f6] text-[12px]">
                      graphic_eq
                    </span>
                    <span className="text-[10px] text-[#e1e1ef] font-semibold tracking-wider tabular-nums">
                      00:42
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#4cd7f6]" />
                </div>

                {/* Center Dynamic Floating Hooks */}
                <div className="relative z-10 flex flex-col items-center gap-2 text-center my-auto">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0c0e17]/90 backdrop-blur-md shadow-[0_0_14px_rgba(76,215,246,0.35)]">
                    <span className="text-[11px] text-[#4cd7f6] font-bold tracking-tight">
                      98% Viral Score
                    </span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#0c0e17]/85 backdrop-blur-sm">
                    <p className="text-[12px] font-bold text-[#e1e1ef] uppercase tracking-wide leading-tight">
                      &ldquo;THE ONE{' '}
                      <span className="text-[#4cd7f6] underline decoration-[#4cd7f6]">
                        FRAMEWORK
                      </span>{' '}
                      THAT CHANGED IT ALL...&rdquo;
                    </p>
                  </div>
                </div>

                {/* Bottom Waveform Scrub Visual */}
                <div className="relative z-10 flex flex-col gap-1.5 pb-1">
                  <div className="flex items-end justify-between gap-1 h-5 px-1">
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-2" />
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-4" />
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-5" />
                    <span className="w-1 bg-[#d0bcff] rounded-full h-3" />
                    <span className="w-1 bg-[#d0bcff] rounded-full h-5" />
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-4" />
                    <span className="w-1 bg-[#d0bcff] rounded-full h-2" />
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-5" />
                    <span className="w-1 bg-[#4cd7f6] rounded-full h-3" />
                  </div>
                  <div className="flex items-center justify-between text-[#cbc3d7] text-[10px]">
                    <span>Active Hook Track</span>
                    <span className="text-[#d0bcff] font-medium">9:16 Auto</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge 1: Top Right Hook Pin */}
            <div className="absolute -top-3 -right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282933]/95 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-white/[0.08]">
              <span className="material-symbols-outlined text-[#4cd7f6] text-[15px]">
                psychology
              </span>
              <span className="text-[11px] text-[#e1e1ef] font-semibold whitespace-nowrap">
                Hook Identified (0:42)
              </span>
            </div>

            {/* Floating Badge 2: Bottom Left Auto-Caption Pill */}
            <div className="absolute -bottom-5 -left-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#282933]/95 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-white/[0.08]">
              <span className="material-symbols-outlined text-[#d0bcff] text-[15px]">
                subtitles
              </span>
              <span className="text-[11px] text-[#e1e1ef] font-semibold whitespace-nowrap">
                Auto-Captioned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Platforms Footer Bar (Mobile bottom placement matching Stitch) */}
      <div className="lg:hidden mt-6 w-full flex flex-col items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#958ea0]">
          Supports Direct Ingestion &amp; Authorized Sources
        </span>
        <div className="w-full flex items-center justify-around py-2.5 px-3 rounded-xl bg-[#0c0e17]/70 border border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-[#cbc3d7]">
            <span className="material-symbols-outlined text-[18px] text-[#ffb4ab]">
              smart_display
            </span>
            <span className="text-[12px] font-medium">YouTube</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#cbc3d7]">
            <span className="material-symbols-outlined text-[18px] text-[#4cd7f6]">
              music_note
            </span>
            <span className="text-[12px] font-medium">TikTok</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#cbc3d7]">
            <span className="material-symbols-outlined text-[18px] text-[#d0bcff]">tv</span>
            <span className="text-[12px] font-medium">Twitch</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#cbc3d7]">
            <span className="material-symbols-outlined text-[18px] text-[#adc6ff]">
              audio_file
            </span>
            <span className="text-[12px] font-medium">MP4 / MOV</span>
          </div>
        </div>
      </div>
    </div>
  );
};
