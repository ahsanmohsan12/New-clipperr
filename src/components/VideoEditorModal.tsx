import React, { useEffect, useState } from 'react';
import { getClipDetails, regenerateClipApi } from '../api/client.ts';
import type {
  CaptionStyleId,
  Clip,
  MusicTrackId,
  TranscriptSegment,
} from '../shared/types.ts';
import {
  CAPTION_COLOR_SWATCHES,
  CAPTION_FONTS,
  CAPTION_STYLES,
  MUSIC_TRACKS,
  formatDuration,
} from '../shared/validation.ts';

interface VideoEditorModalProps {
  clip: Clip;
  onClose: () => void;
  onSaved: (updated: Clip) => void;
}

export const VideoEditorModal: React.FC<VideoEditorModalProps> = ({
  clip,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(clip.title);
  const [sourceDurationSec, setSourceDurationSec] = useState(Math.max(clip.endSec, 20));
  const [startSec, setStartSec] = useState(clip.startSec);
  const [endSec, setEndSec] = useState(clip.endSec);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleId>(clip.captionStyle);
  const [captionColor, setCaptionColor] = useState(clip.captionColor);
  const [captionFont, setCaptionFont] = useState(clip.captionFont);
  const [cropXOffset, setCropXOffset] = useState(clip.cropXOffset);
  const [musicTrack, setMusicTrack] = useState<MusicTrackId>(clip.musicTrack);
  const [speechVolume, setSpeechVolume] = useState(clip.speechVolume);
  const [musicVolume, setMusicVolume] = useState(clip.musicVolume);
  const [subtitles, setSubtitles] = useState<TranscriptSegment[]>(clip.subtitles);
  const [rendering, setRendering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void getClipDetails(clip.id)
      .then((res) => {
        setSourceDurationSec(Math.max(res.sourceDurationSec, clip.endSec));
        if (res.clip.subtitles.length > 0) {
          setSubtitles(res.clip.subtitles);
        }
      })
      .catch(() => {});
  }, [clip.id, clip.endSec]);

  const handleSubtitleChange = (idx: number, text: string) => {
    setSubtitles((prev) => prev.map((s, i) => (i === idx ? { ...s, text } : s)));
  };

  const handleReRender = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (endSec - startSec < 3) {
      setErrorMsg('Clip duration must be at least 3 seconds.');
      return;
    }

    setRendering(true);
    try {
      const updated = await regenerateClipApi(clip.id, {
        title,
        startSec,
        endSec,
        captionStyle,
        captionColor,
        captionFont,
        cropXOffset,
        musicTrack,
        speechVolume,
        musicVolume,
        subtitles,
      });
      onSaved(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to re-render clip.');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit Short: ${clip.title}`}
      className="fixed inset-0 z-50 bg-[#0c0e17]/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-[#1d1f29] border border-white/[0.1] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#191b24]">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#e1e1ef] truncate">
              Customize Short &amp; Re-render
            </h2>
            <p className="text-[12px] text-[#cbc3d7] truncate">
              Optional editor · Adjust trim, captions, framing, or audio mix
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#282933] text-[#e1e1ef] hover:bg-[#373943]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleReRender}
          className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* Left: Vertical Preview */}
          <div className="md:col-span-5 flex flex-col items-center gap-3">
            <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#0c0e17] border border-white/[0.08] relative">
              {clip.status === 'ready' ? (
                <video
                  src={clip.streamUrl}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#cbc3d7] text-[13px]">
                  Preview unavailable until rendered
                </div>
              )}
            </div>
            <p className="text-[12px] text-[#cbc3d7] tabular-nums">
              Trim Window: {formatDuration(startSec)} – {formatDuration(endSec)} (
              {Math.max(0, endSec - startSec).toFixed(1)}s)
            </p>
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div>
              <label htmlFor="editor-title" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1">
                Clip Title
              </label>
              <input
                id="editor-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#0c0e17] border border-white/[0.08] text-[14px] text-[#e1e1ef] focus:outline-none focus:border-[#4cd7f6]"
              />
            </div>

            {/* Trim Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="trim-start" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1 tabular-nums">
                  Start ({startSec.toFixed(1)}s)
                </label>
                <input
                  id="trim-start"
                  type="range"
                  min={0}
                  max={Math.max(0, endSec - 3)}
                  step={0.2}
                  value={startSec}
                  onChange={(e) => setStartSec(Number(e.target.value))}
                  className="w-full accent-[#4cd7f6]"
                />
              </div>
              <div>
                <label htmlFor="trim-end" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1 tabular-nums">
                  End ({endSec.toFixed(1)}s)
                </label>
                <input
                  id="trim-end"
                  type="range"
                  min={Math.min(sourceDurationSec, startSec + 3)}
                  max={sourceDurationSec}
                  step={0.2}
                  value={endSec}
                  onChange={(e) => setEndSec(Number(e.target.value))}
                  className="w-full accent-[#d0bcff]"
                />
              </div>
            </div>

            {/* Caption Style & Font */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="caption-style-select" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1">
                  Caption Style
                </label>
                <select
                  id="caption-style-select"
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value as CaptionStyleId)}
                  className="w-full h-11 px-3 rounded-xl bg-[#0c0e17] border border-white/[0.08] text-[13px] text-[#e1e1ef]"
                >
                  {CAPTION_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="caption-font-select" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1">
                  Caption Font
                </label>
                <select
                  id="caption-font-select"
                  value={captionFont}
                  onChange={(e) => setCaptionFont(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#0c0e17] border border-white/[0.08] text-[13px] text-[#e1e1ef]"
                >
                  {CAPTION_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accent Color Swatches & Crop Pan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <span className="block text-[12px] font-semibold text-[#cbc3d7] mb-1.5">
                  Caption Accent Color
                </span>
                <div className="flex items-center gap-2">
                  {CAPTION_COLOR_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      aria-label={sw.label}
                      onClick={() => setCaptionColor(sw.hex)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        captionColor.toUpperCase() === sw.hex
                          ? 'border-white scale-110'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="crop-pan" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1 tabular-nums">
                  Horizontal Crop Offset ({cropXOffset.toFixed(2)})
                </label>
                <input
                  id="crop-pan"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={cropXOffset}
                  onChange={(e) => setCropXOffset(Number(e.target.value))}
                  className="w-full accent-[#4cd7f6]"
                />
              </div>
            </div>

            {/* Background Music & Volume Mix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="bgm-select" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1">
                  Background Music
                </label>
                <select
                  id="bgm-select"
                  value={musicTrack}
                  onChange={(e) => setMusicTrack(e.target.value as MusicTrackId)}
                  className="w-full h-11 px-3 rounded-xl bg-[#0c0e17] border border-white/[0.08] text-[13px] text-[#e1e1ef]"
                >
                  {MUSIC_TRACKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="speech-vol" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1 tabular-nums">
                  Speech Vol ({Math.round(speechVolume * 100)}%)
                </label>
                <input
                  id="speech-vol"
                  type="range"
                  min={0.2}
                  max={1.8}
                  step={0.05}
                  value={speechVolume}
                  onChange={(e) => setSpeechVolume(Number(e.target.value))}
                  className="w-full accent-[#4cd7f6]"
                />
              </div>
              <div>
                <label htmlFor="music-vol" className="block text-[12px] font-semibold text-[#cbc3d7] mb-1 tabular-nums">
                  Music Vol ({Math.round(musicVolume * 100)}%)
                </label>
                <input
                  id="music-vol"
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.02}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-[#d0bcff]"
                />
              </div>
            </div>

            {/* Editable Subtitle Lines */}
            <div>
              <span className="block text-[12px] font-semibold text-[#cbc3d7] mb-1.5">
                Edit Synchronized Subtitles ({subtitles.length} segments)
              </span>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {subtitles.length === 0 ? (
                  <p className="text-[12px] text-[#958ea0]">No subtitle segments in this clip.</p>
                ) : (
                  subtitles.map((seg, idx) => (
                    <div key={seg.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#4cd7f6] font-mono tabular-nums shrink-0 w-12">
                        {seg.startSec.toFixed(1)}s
                      </span>
                      <input
                        type="text"
                        aria-label={`Subtitle line ${idx + 1}`}
                        value={seg.text}
                        onChange={(e) => handleSubtitleChange(idx, e.target.value)}
                        className="flex-1 h-9 px-2.5 rounded-lg bg-[#0c0e17] border border-white/[0.08] text-[12px] text-[#e1e1ef]"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/30 px-3 py-2 text-[12px] text-[#ffdad6]">
                {errorMsg}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-xl bg-[#282933] text-[#e1e1ef] text-[13px] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rendering}
                className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-[#a078ff] to-[#03b5d3] text-[#001f26] font-semibold text-[13px] flex items-center gap-2 disabled:opacity-60"
              >
                {rendering ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-[#001f26] border-t-transparent rounded-full animate-spin" />
                    <span>Re-rendering MP4...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">movie_edit</span>
                    <span>Re-render Short</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
