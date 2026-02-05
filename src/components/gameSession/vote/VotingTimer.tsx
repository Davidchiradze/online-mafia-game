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
      <div className="text-2xl font-bold text-amber-400">{timeLeft}s</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
    </div>
  );
}

