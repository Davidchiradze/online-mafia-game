"use client";

import { cn } from "@/shared/lib/cn";

type LeaderboardStatProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
};

/**
 * Icon-over-value stat cell for the stacked strips — the podium cards and the
 * mobile row footer. The desktop row uses `LeaderboardRowStat`, which is laid
 * out for a fixed-width column instead.
 */
export default function LeaderboardStat({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: LeaderboardStatProps) {
  return (
    <div className="flex flex-col items-center px-1 text-center">
      <span
        className={cn(
          "mb-1 flex items-center gap-0.5 font-inter text-[0.55rem] uppercase tracking-wide",
          highlight ? "text-orange-400" : "text-zinc-500",
        )}
      >
        {icon} {label}
      </span>
      <span className="font-orbitron text-sm font-bold text-white">{value}</span>
      {sub && (
        <span className="mt-0.5 font-inter text-[0.55rem] text-zinc-500">
          {sub}
        </span>
      )}
    </div>
  );
}
