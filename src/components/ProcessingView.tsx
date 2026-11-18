import React from 'react';
import type { Project } from '../shared/types.ts';
import { formatDuration } from '../shared/validation.ts';

interface ProcessingViewProps {
  project: Project;
  onCancel: () => void;
  onRetry: () => void;
  onViewResults: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  project,
  onCancel,
  onRetry,
  onViewResults,
}) => {
  const isFailed = project.status === 'failed';
  const isCancelled = project.status === 'cancelled';
  const isCompleted = project.status === 'completed';

  const activeStage =
    project.stages.find((s) => s.status === 'processing') ||
    project.stages.find((s) => s.status === 'failed') ||
    project.stages[Math.max(0, project.currentStage - 1)];

  const stageLabel = isFailed
    ? 'PIPELINE HALTED'
    : isCancelled
      ? 'CANCELLED'
      : isCompleted
        ? 'COMPLETE'
        : activeStage?.stageKey === 'render'
          ? 'RENDERING MP4'
          : activeStage?.stageKey === 'captions'
            ? 'CAPTIONING'
            : activeStage?.stageKey === 'sound_design'
              ? 'MIXING AUDIO'
              : 'SYNTHESIZING';

  return (
    <div className="w-full max-w-2xl mx-auto px-5 pt-4 pb-16 flex flex-col items-center">
      {/* Luminescent 3D AI Orb Visualizer */}
      <div className="relative w-48 h-48 my-5 flex items-center justify-center">
        {/* Ambient Glow Behind Orb */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transform scale-110 pointer-events-none ${
            isFailed
              ? 'bg-[#ffb4ab]/20'
              : 'bg-gradient-to-tr from-[#d0bcff]/30 to-[#4cd7f6]/30'
          }`}
        />
        {/* Outer Orbit Ring (Counter Clockwise) */}
        <div
          className={`absolute inset-2 rounded-full border border-dashed border-[#4cd7f6]/30 ${
            !isFailed && !isCancelled ? 'animate-[spin_12s_linear_infinite_reverse]' : ''
          }`}
        />
        {/* Middle Concentric Kinetic Ring */}
        <div
          className={`absolute inset-6 rounded-full border border-[#d0bcff]/40 ${
            !isFailed && !isCancelled ? 'animate-[spin_8s_linear_infinite]' : ''
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#4cd7f6] shadow-[0_0_12px_#4cd7f6] -top-1.5 left-1/2 -translate-x-1/2 absolute" />
        </div>
        {/* Core Glowing Orb with SVG Audio Waves */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#a078ff] via-[#282933] to-[#0c0e17] shadow-[0_0_36px_rgba(208,188,255,0.4)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(208,188,255,0.55),transparent_70%)]" />
          {isFailed ? (
            <span className="material-symbols-outlined text-[42px] text-[#ffb4ab] relative z-10">
              error
            </span>
          ) : (
            <svg className="w-14 h-14 relative z-10 text-[#e1e1ef]" fill="none" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" />
              <rect fill="#4cd7f6" height="12" rx="1.5" width="3" x="12" y="18">
                <animate attributeName="height" dur="1.2s" repeatCount="indefinite" values="12;22;8;18;12" />
                <animate attributeName="y" dur="1.2s" repeatCount="indefinite" values="18;13;20;15;18" />
              </rect>
              <rect fill="#d0bcff" height="20" rx="1.5" width="3" x="18" y="14">
                <animate attributeName="height" dur="1s" repeatCount="indefinite" values="20;10;24;14;20" />
                <animate attributeName="y" dur="1s" repeatCount="indefinite" values="14;19;12;17;14" />
              </rect>
              <rect fill="#4cd7f6" height="28" rx="1.5" width="3" x="24" y="10">
                <animate attributeName="height" dur="0.8s" repeatCount="indefinite" values="28;16;32;20;28" />
                <animate attributeName="y" dur="0.8s" repeatCount="indefinite" values="10;16;8;14;10" />
              </rect>
              <rect fill="#d0bcff" height="20" rx="1.5" width="3" x="30" y="14">
                <animate attributeName="height" dur="1.1s" repeatCount="indefinite" values="20;26;12;22;20" />
                <animate attributeName="y" dur="1.1s" repeatCount="indefinite" values="14;11;18;13;14" />
              </rect>
              <rect fill="#4cd7f6" height="12" rx="1.5" width="3" x="36" y="18">
                <animate attributeName="height" dur="1.3s" repeatCount="indefinite" values="12;18;6;16;12" />
                <animate attributeName="y" dur="1.3s" repeatCount="indefinite" values="18;15;21;16;18" />
              </rect>
            </svg>
          )}
          <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/10 blur-sm pointer-events-none" />
        </div>

        <span className="material-symbols-outlined text-[#d0bcff] absolute bottom-4 left-6 text-[18px]">
          auto_awesome
        </span>
      </div>

      {/* Title & Source Metadata */}
      <div className="text-center w-full mb-5">
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          {!isFailed && !isCancelled && !isCompleted && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#4cd7f6] shadow-[0_0_10px_#4cd7f6] animate-pulse" />
          )}
          <h2 className="text-[24px] font-semibold text-[#e1e1ef] tracking-tight">
            {isFailed
              ? 'Processing Error'
              : isCancelled
                ? 'Generation Cancelled'
                : isCompleted
                  ? 'Shorts Ready!'
                  : 'Creating Your Shorts...'}
          </h2>
        </div>
        <p className="text-[12px] text-[#cbc3d7] truncate max-w-md mx-auto">
          Source:{' '}
          <span className="text-[#e1e1ef] font-medium">&ldquo;{project.title}&rdquo;</span>{' '}
          {project.durationSec > 0 && (
            <span className="text-[#958ea0] tabular-nums">
              ({formatDuration(project.durationSec)} long)
            </span>
          )}
        </p>
      </div>

      {/* Progress Meter Section */}
      <div className="w-full bg-[#191b24] rounded-xl p-4 shadow-md mb-5 border border-white/[0.06]">
        <div className="flex items-baseline justify-between mb-2.5">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="processing-percentage"
              className={`text-[34px] leading-none font-bold tracking-tight tabular-nums ${
                isFailed
                  ? 'text-[#ffb4ab]'
                  : 'text-[#4cd7f6] drop-shadow-[0_0_16px_rgba(76,215,246,0.4)]'
              }`}
            >
              {project.progressPct}%
            </span>
            <span className="text-[11px] font-semibold text-[#cbc3d7] tracking-wider uppercase">
              {stageLabel}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 bg-[#282933] px-2.5 py-1 rounded-full">
            <span className="material-symbols-outlined text-[#4cd7f6] text-[14px]">schedule</span>
            <span className="text-[11px] font-semibold text-[#e1e1ef] tabular-nums">
              {isCompleted
                ? `${project.clipCount} clips ready`
                : isFailed || isCancelled
                  ? 'Stopped'
                  : project.etaSeconds > 0
                    ? `~${project.etaSeconds}s remaining`
                    : 'Finalizing...'}
            </span>
          </div>
        </div>

        {/* Glowing Progress Bar */}
        <div className="w-full h-2 bg-[#32343e] rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out relative ${
              isFailed
                ? 'bg-[#ffb4ab]'
                : 'bg-gradient-to-r from-[#d0bcff] via-[#4cd7f6] to-[#acedff]'
            }`}
            style={{ width: `${Math.max(2, project.progressPct)}%` }}
          >
            {!isFailed && !isCancelled && !isCompleted && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </div>
        </div>
      </div>

      {/* Error Banner if Failed */}
      {isFailed && project.errorMessage && (
        <div
          role="alert"
          className="w-full mb-5 rounded-xl bg-[#93000a]/30 border border-[#ffb4ab]/35 p-4 flex flex-col gap-3"
        >
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] shrink-0">
              warning
            </span>
            <p className="text-[13px] text-[#ffdad6] leading-relaxed">{project.errorMessage}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[40px] px-4 rounded-xl bg-[#a078ff] hover:bg-[#d0bcff] text-[#23005c] text-[13px] font-semibold transition-colors"
            >
              Retry Processing
            </button>
          </div>
        </div>
      )}

      {/* Processing Pipeline Stepper (6 Real Backend Stages) */}
      <div className="w-full bg-[#1d1f29] rounded-xl p-4 shadow-sm mb-4 flex flex-col gap-2 border border-white/[0.06]">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-semibold text-[#cbc3d7] uppercase tracking-wider">
            Pipeline Checklist
          </span>
          <span className="text-[11px] font-semibold text-[#4cd7f6] flex items-center gap-1.5 tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6]" />
            Step {Math.max(1, project.currentStage)} of {project.stages.length}
            {project.clipCount > 0 ? ` · ${project.clipCount} clips` : ''}
          </span>
        </div>

        {project.stages.map((stage) => {
          if (stage.status === 'completed') {
            return (
              <div key={stage.stageIndex} className="flex items-center gap-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#4cd7f6]/15 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-[#4cd7f6] text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#cbc3d7] line-through opacity-80 truncate">
                    {stage.title}
                  </p>
                  <p className="text-[11px] text-[#958ea0] truncate">{stage.subtitle}</p>
                </div>
              </div>
            );
          }

          if (stage.status === 'processing') {
            return (
              <div
                key={stage.stageIndex}
                className="flex items-center gap-2.5 py-2.5 px-2.5 -mx-1 rounded-xl bg-[#282933] shadow-inner"
              >
                <div className="w-6 h-6 rounded-full bg-[#d0bcff]/20 flex items-center justify-center shrink-0 relative">
                  <span className="material-symbols-outlined text-[#d0bcff] text-[16px] animate-spin">
                    sync
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#e1e1ef] font-semibold truncate">{stage.title}</p>
                  <p className="text-[11px] text-[#d0bcff] truncate">{stage.subtitle}</p>
                </div>
                <span className="text-[11px] font-semibold bg-[#d0bcff]/15 text-[#d0bcff] px-2.5 py-0.5 rounded-full shrink-0">
                  Processing
                </span>
              </div>
            );
          }

          if (stage.status === 'failed') {
            return (
              <div
                key={stage.stageIndex}
                className="flex items-center gap-2.5 py-2.5 px-2.5 -mx-1 rounded-xl bg-[#93000a]/25 border border-[#ffb4ab]/30"
              >
                <div className="w-6 h-6 rounded-full bg-[#ffb4ab]/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#ffb4ab] text-[16px]">
                    error
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#ffdad6] font-semibold truncate">{stage.title}</p>
                  <p className="text-[11px] text-[#ffb4ab] truncate">{stage.subtitle}</p>
                </div>
                <span className="text-[11px] font-semibold bg-[#ffb4ab]/15 text-[#ffb4ab] px-2.5 py-0.5 rounded-full shrink-0">
                  Failed
                </span>
              </div>
            );
          }

          return (
            <div key={stage.stageIndex} className="flex items-center gap-2.5 py-1.5 opacity-45">
              <div className="w-6 h-6 rounded-full bg-[#32343e] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#958ea0] text-[16px]">
                  radio_button_unchecked
                </span>
              </div>
              <span className="text-[12px] text-[#e1e1ef] min-w-0 truncate">{stage.title}</span>
            </div>
          );
        })}
      </div>

      {/* Reassurance Banner */}
      <div className="w-full bg-[#0c0e17]/70 border border-white/[0.05] rounded-xl p-3 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#282933] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">coffee</span>
        </div>
        <p className="text-[12px] text-[#cbc3d7] leading-snug">
          Feel free to stay or grab a coffee — your processing continues in the background and clips are saved automatically.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {isCompleted ? (
          <button
            type="button"
            onClick={onViewResults}
            className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#a078ff] to-[#03b5d3] text-white font-semibold text-[14px] flex items-center gap-2 shadow-lg"
          >
            <span>View Generated Shorts</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        ) : (
          !isFailed &&
          !isCancelled && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2 text-[13px] font-medium text-[#958ea0] hover:text-[#ffb4ab] transition-colors inline-flex items-center gap-1.5 group"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform">
                close
              </span>
              <span>Cancel Generation</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};
