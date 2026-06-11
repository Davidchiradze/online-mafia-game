"use client";

import { Crosshair, Gamepad2 } from "lucide-react";
import type { PlayerStats } from "@convex/refs/history";

interface Props {
  stats: PlayerStats | undefined;
}

export default function StatsHeader({ stats }: Props) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
      <div>
        <h1 className="mb-3 font-orbitron text-4xl font-bold uppercase tracking-widest text-white drop-shadow-sm sm:text-5xl">
          Match History
        </h1>
        <p className="max-w-2xl font-inter text-lg text-zinc-400">
          Your past games and statistics.
        </p>
      </div>

      <div className="flex shrink-0 gap-4">
        <StatCard
          icon={<Crosshair className="h-3.5 w-3.5" />}
          label="Overall Win Rate"
          value={stats === undefined ? "—" : `${stats.winRate}%`}
          accent="bg-[#00ff66]/80 shadow-[0_0_10px_rgba(0,255,102,0.8)]"
        />
        <StatCard
          icon={<Gamepad2 className="h-3.5 w-3.5" />}
          label="Total Matches"
          value={stats === undefined ? "—" : String(stats.totalMatches)}
          accent="bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative min-w-[140px] overflow-hidden rounded-xl border border-white/5 bg-[#13131a]/80 p-5 shadow-xl backdrop-blur-xl">
      <div className={`absolute left-0 top-0 h-[2px] w-full ${accent}`} />
      <div className="mb-2 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
        {icon} {label}
      </div>
      <div className="font-orbitron text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
