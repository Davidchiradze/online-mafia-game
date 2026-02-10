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
      <div className="text-2xl font-bold text-emerald-400">{timeLeft}s</div>
      <div className="text-xs text-white/50">{subtitle}</div>
    </div>
  );
}
