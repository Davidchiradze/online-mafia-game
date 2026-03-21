"use client";

type Props = {
  timeLeft: number;
  subtitle: string;
};

/**
 * Countdown timer display for voting window.
 */
export function VotingTimer({ timeLeft, subtitle }: Props) {
  return (
    <div className="text-center">
      <div
        className="text-3xl font-bold text-emerald-300"
        style={{
          fontFamily: "var(--font-orbitron), sans-serif",
          textShadow: "0 0 20px rgba(52,211,153,0.6), 0 0 8px rgba(52,211,153,0.3)",
        }}
      >
        {timeLeft}s
      </div>
      <div
        className="text-xs text-white/50 mt-0.5"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        {subtitle}
      </div>
    </div>
  );
}
