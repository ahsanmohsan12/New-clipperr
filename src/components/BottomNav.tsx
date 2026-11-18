import React from 'react';
import type { AppRoute } from './Header.tsx';

interface BottomNavProps {
  route: AppRoute;
  hasActiveClips: boolean;
  onNavigate: (route: AppRoute) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  route,
  hasActiveClips,
  onNavigate,
}) => {
  if (route === 'processing') {
    return null;
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#0c0e17]/90 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-1px_12px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-around h-16 px-4">
        <button
          type="button"
          onClick={() => onNavigate('studio')}
          aria-current={route === 'studio' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[64px] transition-colors ${
            route === 'studio' ? 'text-[#4cd7f6]' : 'text-[#cbc3d7] hover:text-[#e1e1ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
          <span className="text-[11px] font-semibold mt-0.5 tracking-wide">Studio</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('results')}
          aria-current={route === 'results' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[64px] transition-colors ${
            route === 'results'
              ? 'text-[#4cd7f6]'
              : hasActiveClips
                ? 'text-[#cbc3d7] hover:text-[#e1e1ef]'
                : 'text-[#958ea0]/60'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">video_library</span>
          <span className="text-[11px] font-semibold mt-0.5 tracking-wide">Clips</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('account')}
          aria-current={route === 'account' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[64px] transition-colors ${
            route === 'account' ? 'text-[#4cd7f6]' : 'text-[#cbc3d7] hover:text-[#e1e1ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
          <span className="text-[11px] font-semibold mt-0.5 tracking-wide">Account</span>
        </button>
      </div>
    </nav>
  );
};
