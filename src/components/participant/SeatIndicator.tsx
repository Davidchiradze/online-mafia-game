"use client";

interface SeatIndicatorProps {
  /** Value shown inside the dial — seat number, or "H" for the host. */
  label: string | number;
  /** Whether this seat is currently nominated (red, pulsing). */
  showNominationEffect: boolean;
  /** Whether this seat belongs to the host (gold accent). */
  isTargetHost: boolean;
  /** Active speaker timer progress (0 → 100). 0 when not the speaker. */
  speakingProgress?: number;
}

// Circular dial geometry (SVG viewBox is 36×36).
const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * SeatIndicator - Circular seat-number badge wrapped by a speaking countdown
 * ring. While the player is the active speaker the ring depletes clockwise as
 * their time runs out, shifting emerald → amber → red for urgency.
 */
export default function SeatIndicator({
  label,
  showNominationEffect,
  isTargetHost,
  speakingProgress = 0,
}: SeatIndicatorProps) {
  // The ring depletes as the speaker's time runs out. `speakingProgress`
  // climbs 0 → 100, so the visible arc is the remainder.
  const showSpeakingRing = speakingProgress > 0 && speakingProgress < 100;
  const remainingPct = Math.max(0, 100 - speakingProgress);
  const ringDashOffset = (RING_CIRCUMFERENCE * speakingProgress) / 100;
  const ringStroke =
    remainingPct <= 20 ? "#ef4444" : remainingPct <= 50 ? "#fbbf24" : "#34d399";

  const badgeClass = showNominationEffect
    ? "bg-red-700/50 border-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"
    : isTargetHost
      ? "bg-yellow-600/40 border-yellow-500/60 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
      : "bg-black/70 border-white/20";

  const labelClass = showNominationEffect
    ? "text-red-300"
    : isTargetHost
      ? "text-yellow-200"
      : "text-white/90";

  return (
    <div className="relative shrink-0 flex items-center justify-center">
      {/* Countdown ring (only while this player is the active speaker) */}
      {showSpeakingRing && (
        <svg
          viewBox="0 0 36 36"
          className="absolute -inset-[3px] lg:-inset-1 w-[calc(100%+6px)] h-[calc(100%+6px)] lg:w-[calc(100%+8px)] lg:h-[calc(100%+8px)] -rotate-90 pointer-events-none"
          style={{ filter: `drop-shadow(0 0 4px ${ringStroke})` }}
        >
          {/* Track */}
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3"
          />
          {/* Remaining time arc */}
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke={ringStroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={-ringDashOffset}
            style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.3s ease" }}
          />
        </svg>
      )}

      {/* Seat number badge */}
      <div
        className={`w-5 h-5 lg:w-6 lg:h-6 aspect-square rounded-full flex items-center justify-center transition-all border ${
          showSpeakingRing ? "border-transparent bg-black/70" : badgeClass
        }`}
      >
        <span
          className={`font-orbitron text-[0.55rem] lg:text-[0.7rem] font-bold leading-none ${
            showSpeakingRing ? "text-white" : labelClass
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
