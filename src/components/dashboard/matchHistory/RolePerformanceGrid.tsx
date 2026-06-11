"use client";

import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";
import {
  roleToFaction,
  factionIcon,
  factionBadgeClass,
  roleLabel,
} from "@/lib/game/roleDisplay";
import type { PlayerStats, RoleStat } from "@convex/refs/history";

interface Props {
  stats: PlayerStats | undefined;
}

export default function RolePerformanceGrid({ stats }: Props) {
  if (stats === undefined) {
    return (
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/40"
          />
        ))}
      </div>
    );
  }

  // Nothing to show until the player has finished at least one game.
  if (stats.totalMatches === 0) return null;

  // Show every role — fill roles the player hasn't held with zeros — then float
  // the most-played roles to the front (stable: unplayed stay in canonical order).
  const played = new Map<string, RoleStat>(
    stats.roleStats.map((r) => [r.role, r]),
  );
  const allRoles: RoleStat[] = JAPANESE_MAFIA_ROLES.map(
    (role) =>
      played.get(role) ?? { role, matches: 0, wins: 0, losses: 0, winRate: 0 },
  ).sort((a, b) => b.matches - a.matches);

  return (
    <div className="mb-10">
      <h3 className="mb-4 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-500">
        <UserCircle className="h-4 w-4" /> Role Performance
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {allRoles.map((stat) => {
          const faction = roleToFaction(stat.role);
          const Icon = factionIcon(faction);
          return (
            <div
              key={stat.role}
              className="relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#13131a]/60 p-4 backdrop-blur-md transition-colors hover:bg-[#1a1a24]"
            >
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-md border p-1.5",
                    factionBadgeClass(faction),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="truncate text-sm font-bold text-white">
                  {roleLabel(stat.role)}
                </span>
              </div>
              <div className="mt-auto flex items-end justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Plays
                  </span>
                  <span className="font-orbitron text-lg font-bold text-zinc-300">
                    {stat.matches}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Win Rate
                  </span>
                  <span
                    className={cn(
                      "font-orbitron text-lg font-bold",
                      stat.winRate >= 50
                        ? "text-[#00ff66]"
                        : stat.winRate === 0 && stat.wins + stat.losses > 0
                          ? "text-[#ff2a2a]"
                          : "text-zinc-300",
                    )}
                  >
                    {stat.winRate}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
