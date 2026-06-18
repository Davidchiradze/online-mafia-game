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
  // Draw the remaining arc via the dash *length* (with a zero offset) rather
  // than a negative dash-offset. WebKit/iOS Safari renders the dash-offset
  // direction opposite to Blink, which inverted the ring on iPhones; sizing
  // the visible dash directly is direction-agnostic and identical on all
  // engines.
  const ringDashArray = `${(RING_CIRCUMFERENCE * remainingPct) / 100} ${RING_CIRCUMFERENCE}`;
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
      {/* Countdown ring (only while this player is the active speaker).
          `-rotate-90` puts the arc start at 12 o'clock; `-scale-y-100`
          reverses the circle's winding so the dash depletes clockwise from
          the right rather than the left. */}
      {showSpeakingRing && (
        <svg
          viewBox="0 0 36 36"
          className="absolute -inset-[3px] tlg:-inset-1 w-[calc(100%+6px)] h-[calc(100%+6px)] tlg:w-[calc(100%+8px)] tlg:h-[calc(100%+8px)] -rotate-90 -scale-y-100 pointer-events-none"
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
            strokeDasharray={ringDashArray}
            style={{ transition: "stroke-dasharray 0.2s linear, stroke 0.3s ease" }}
          />
        </svg>
      )}

      {/* Seat number badge */}
      <div
        className={`w-4 h-4 tsm:w-5 tsm:h-5 tlg:w-6 tlg:h-6 aspect-square rounded-full flex items-center justify-center transition-all border ${
          showSpeakingRing ? "border-transparent bg-black/70" : badgeClass
        }`}
      >
        <span
          className={`font-orbitron text-[0.45rem] tsm:text-[0.55rem] tlg:text-[0.7rem] font-bold leading-none ${
            showSpeakingRing ? "text-white" : labelClass
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
