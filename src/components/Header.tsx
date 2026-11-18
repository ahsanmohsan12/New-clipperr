import React from 'react';

export type AppRoute = 'studio' | 'processing' | 'results' | 'account';

interface HeaderProps {
  route: AppRoute;
  hasActiveClips: boolean;
  onNavigate: (route: AppRoute) => void;
  onBackFromProcessing: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  route,
  hasActiveClips,
  onNavigate,
  onBackFromProcessing,
}) => {
  if (route === 'processing') {
    return (
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0c0e17]/85 backdrop-blur-xl border-b border-white/[0.06] pt-safe">
        <div className="max-w-6xl mx-auto h-16 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Go back to Studio"
              onClick={onBackFromProcessing}
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#e1e1ef] hover:text-[#d0bcff] transition-colors rounded-xl"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/src/assets/images/clipforge_logo_1794995439741.jpg"
                alt="ClipForge AI Logo"
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/10"
              />
              <h1 className="text-[16px] font-semibold text-[#e1e1ef] tracking-tight whitespace-nowrap">
                Active Generation Flow
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open Library & Settings"
              onClick={() => onNavigate('account')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#cbc3d7] hover:text-[#e1e1ef] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
            <button
              type="button"
              aria-label="View Account & Saved Projects"
              onClick={() => onNavigate('account')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <img
                src="/src/assets/images/creator_avatar_1794995440426.jpg"
                alt="Creator profile"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15"
              />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0c0e17]/85 backdrop-blur-xl border-b border-white/[0.06] pt-safe">
      <div className="max-w-6xl mx-auto h-16 px-5 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => onNavigate('studio')}
          className="flex items-center gap-2.5 shrink-0 text-left group"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 rounded-full bg-[#d0bcff]/20 blur-sm group-hover:bg-[#4cd7f6]/25 transition-colors" />
            <img
              src="/src/assets/images/clipforge_logo_1794995439741.jpg"
              alt="ClipForge AI Logo"
              className="relative h-8 w-8 rounded-lg object-cover ring-1 ring-white/15"
            />
          </div>
          <span className="text-[16px] font-semibold text-[#e1e1ef] tracking-tight whitespace-nowrap">
            ClipForge AI
          </span>
        </button>

        {/* Desktop navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className={`px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              route === 'studio'
                ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6]'
                : 'text-[#cbc3d7] hover:text-[#e1e1ef]'
            }`}
          >
            Studio
          </button>
          <button
            type="button"
            onClick={() => onNavigate('results')}
            disabled={!hasActiveClips}
            className={`px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              route === 'results'
                ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6]'
                : hasActiveClips
                  ? 'text-[#cbc3d7] hover:text-[#e1e1ef]'
                  : 'text-[#958ea0]/50 cursor-not-allowed'
            }`}
          >
            Clips
          </button>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className={`px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              route === 'account'
                ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6]'
                : 'text-[#cbc3d7] hover:text-[#e1e1ef]'
            }`}
          >
            Library & Presets
          </button>
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Global Export Settings"
            onClick={() => onNavigate('account')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#cbc3d7] hover:text-[#e1e1ef] hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">tune</span>
          </button>
          <button
            type="button"
            aria-label="Account & Project History"
            onClick={() => onNavigate('account')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1"
          >
            <img
              src="/src/assets/images/creator_avatar_1794995440426.jpg"
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
