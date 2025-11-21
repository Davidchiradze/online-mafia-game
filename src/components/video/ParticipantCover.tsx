/**
 * ParticipantCover - Overlay component shown when a participant should not be visible
 *
 * This component is displayed instead of the participant's video during phases where
 * they should be hidden (e.g., night phase, role selection, etc.)
 */

interface ParticipantCoverProps {
  /** Message/emoji to display on the cover */
  message?: string;
  /** Custom className for styling */
  className?: string;
}

export default function ParticipantCover({
  message = "💤",
  className = "",
}: ParticipantCoverProps) {
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
