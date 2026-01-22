"use client";

/**
 * Visual indicator showing who the Yakuza has selected as their target.
 * Displayed to the host and Yakuza member with kill authority.
 * Uses violet/purple theme to distinguish from Mafia's red theme.
 */
export default function YakuzaTargetIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-violet-600 text-white ring-4 ring-violet-400 ring-opacity-50 shadow-lg backdrop-blur-sm">
        <span className="text-lg md:text-xl">⚔️</span>
      </div>
    </div>
  );
}

