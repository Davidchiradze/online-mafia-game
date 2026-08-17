"use client";

import { cn } from "@/shared/lib/cn";

type LeaderboardRowStatProps = {
  label: string;
  value: string;
  title?: string;
  highlight?: boolean;
};

/**
 * Value-over-label stat cell in a fixed-width column, for the desktop ranked
 * row where the stats sit side by side and must line up down the board. The
 * stacked, icon-led variant is `LeaderboardStat`.
 */
export default function LeaderboardRowStat({
  label,
  value,
  title,
  highlight = false,
}: LeaderboardRowStatProps) {
  return (
    <div className="flex w-20 flex-col items-center text-center" title={title}>
      <span
        className={cn(
          "font-orbitron text-sm font-bold",
          highlight ? "text-orange-400" : "text-white",
        )}
      >
        {value}
      </span>
      <span className="mt-0.5 font-inter text-[0.55rem] uppercase tracking-wide text-zinc-500">
        {label}
      </span>
    </div>
  );
}
