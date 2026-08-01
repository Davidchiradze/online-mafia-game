"use client";

import { cn } from "@/shared/lib/cn";
import { RANK_LEVELS } from "@/shared/lib/constants/ranking";

// Circular dial geometry (SVG viewBox is 36×36) — same ring math as
// SeatIndicator. The dial has a 60° opening at the bottom like a car gauge;
// the colored arc fills `level / 10` of the track, so higher levels visibly
// fill up.
const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GAP_DEGREES = 60;
const TRACK_LENGTH = RING_CIRCUMFERENCE * ((360 - GAP_DEGREES) / 360);

const SIZE_PX = { sm: 20, md: 32, lg: 64 } as const;
const FONT_CLASS = {
  sm: "text-[0.5rem]",
  md: "text-[0.7rem]",
  lg: "text-xl",
} as const;

interface LevelBadgeProps {
  /** Skill level 1–10 (out-of-range values are clamped). */
  level: number;
  size?: keyof typeof SIZE_PX;
  className?: string;
  /** Optional tooltip, e.g. "1134 ELO — 66 to Level 5" (built by callers). */
  title?: string;
}

/**
 * LevelBadge - FACEIT-style circular skill-level badge (see
 * /docs/ranking-system.md §6). One SVG component for every surface; colors
 * and brackets come from `RANK_LEVELS` — no magic numbers here.
 */
export default function LevelBadge({
  level,
  size = "md",
  className,
  title,
}: LevelBadgeProps) {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  const { hex } = RANK_LEVELS[clamped - 1];
  const px = SIZE_PX[size];
  // Draw arcs via the dash *length* (zero offset) — direction-agnostic across
  // WebKit/Blink, same trick as SeatIndicator's countdown ring.
  const trackDashArray = `${TRACK_LENGTH} ${RING_CIRCUMFERENCE}`;
  const levelDashArray = `${(TRACK_LENGTH * clamped) / 10} ${RING_CIRCUMFERENCE}`;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: px, height: px }}
      title={title}
    >
      {/* A circle's dash starts at 3 o'clock and runs clockwise; +120°
          rotation moves that start to the bottom-left edge of the gap, so the
          arc sweeps clockwise and the opening stays centered at the bottom. */}
      <svg
        viewBox="0 0 36 36"
        className="absolute inset-0 h-full w-full rotate-[120deg]"
      >
        <circle cx="18" cy="18" r="12.5" className="fill-zinc-800" />
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="3"
          strokeDasharray={trackDashArray}
        />
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          stroke={hex}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={levelDashArray}
          style={{ filter: `drop-shadow(0 0 2px ${hex})` }}
        />
      </svg>
      <span
        className={cn(
          "relative font-orbitron font-bold leading-none text-white",
          FONT_CLASS[size],
        )}
      >
        {clamped}
      </span>
    </div>
  );
}
