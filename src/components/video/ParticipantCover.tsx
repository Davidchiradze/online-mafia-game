/**
 * ParticipantCover - Overlay component shown when a participant should not be visible
 *
 * This component is displayed instead of the participant's video during phases where
 * they should be hidden (e.g., night phase, role selection, etc.)
 * Also handles disconnected state with network issues UI.
 */

interface ParticipantCoverProps {
  /** Message/emoji to display on the cover */
  message?: string;
  /** Custom className for styling */
  className?: string;
  /** Whether the participant is disconnected (shows network issues UI) */
  isDisconnected?: boolean;
}

export default function ParticipantCover({
  message = "💤",
  className = "",
  isDisconnected = false,
}: ParticipantCoverProps) {
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
      <div className="text-6xl md:text-8xl animate-pulse">{message}</div>

      {/* Subtle overlay pattern for visual interest */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
