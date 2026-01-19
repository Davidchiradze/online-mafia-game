/**
 * ParticipantCover - Overlay component shown when a participant should not be visible
 *
 * This component is displayed instead of the participant's video during phases where
 * they should be hidden (e.g., night phase, role selection, etc.)
 * Also handles disconnected state with network issues UI and dead player state.
 */

import LoadingSpinner from "../ui/LoadingSpinner";

interface ParticipantCoverProps {
  /** Message/emoji to display on the cover */
  message?: string;
  /** Custom className for styling */
  className?: string;
  /** Whether the participant is disconnected (shows network issues UI) */
  isDisconnected?: boolean;
  /** Whether the participant is dead (shows permanent dead overlay) */
  isDead?: boolean;
}

export default function ParticipantCover({
  message = "",
  className = "",
  isDisconnected = false,
  isDead = false,
}: ParticipantCoverProps) {
  // Dead state takes priority - show permanent dead overlay
  if (isDead) {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black pointer-events-none ${className}`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Skull icon */}
          <div className="text-5xl md:text-7xl grayscale opacity-80">💀</div>
          <div className="text-sm md:text-base text-gray-400 font-semibold uppercase tracking-wider">
            Dead
          </div>
        </div>

        {/* Grayscale vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] pointer-events-none" />

        {/* Subtle cross pattern for visual interest */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
      </div>
    );
  }

  if (isDisconnected) {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-red-900/80 via-red-800/60 to-red-900/80 ${className}`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-4xl md:text-6xl animate-pulse">📡</div>
          <div className="text-xs md:text-sm text-red-200 font-medium">
            Network Issues
          </div>
          <div className="text-[10px] md:text-xs text-red-300/70">
            Connection lost
          </div>
        </div>

        {/* Subtle overlay pattern for visual interest */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black ${className}`}
    >
      {/* Animated sleeping emoji */}
      <div className="text-6xl md:text-8xl animate-pulse">
        {message || <LoadingSpinner />}
      </div>

      {/* Subtle overlay pattern for visual interest */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
