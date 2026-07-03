"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { DashboardCard, CardTitle, EmptyState } from "./primitives";

type SortBy = "wins" | "winRate" | "matches";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Rank-badge tint for the podium positions; rest fall back to neutral. */
const RANK_RING = [
  "ring-amber-400/40 bg-amber-400/10",
  "ring-slate-300/30 bg-slate-300/10",
  "ring-orange-400/30 bg-orange-400/10",
];

export default function TopPlayersLeaderboard() {
  const t = useTranslations("admin");
  const [sortBy, setSortBy] = useState<SortBy>("wins");
  const players = useQuery(api.admin.stats.topPlayers, { sortBy, limit: 10 });

  const tabs: { key: SortBy; label: string }[] = [
    { key: "wins", label: t("dashboard.leaderboard.byWins") },
    { key: "winRate", label: t("dashboard.leaderboard.byWinRate") },
    { key: "matches", label: t("dashboard.leaderboard.byMatches") },
  ];

  return (
    <DashboardCard accent="amber" className="h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle icon={<Trophy className="h-4 w-4" />}>
          {t("dashboard.leaderboard.title")}
        </CardTitle>
        <div className="flex gap-1 rounded-xl bg-black/20 p-1 ring-1 ring-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                sortBy === tab.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {players === undefined ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner message={t("loading")} />
          </div>
        ) : players.length === 0 ? (
          <EmptyState>{t("dashboard.leaderboard.empty")}</EmptyState>
        ) : (
          <ol className="-mr-2 max-h-80 space-y-1 overflow-y-auto pr-2 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]">
            {players.map((p, i) => (
              <li
                key={p.playerId}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                    i < 3
                      ? `text-white ring-1 ${RANK_RING[i]}`
                      : "text-slate-500",
                  )}
                >
                  {MEDALS[i] ?? i + 1}
                </span>
                <UserAvatar src={p.avatar} name={p.nickname} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                  {p.nickname}
                </span>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ width: `${p.winRate}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-slate-400">
                    {p.winRate}%
                  </span>
                </div>
                <span className="w-10 text-right font-orbitron text-sm font-semibold text-white">
                  {p.wins}
                </span>
                <span className="hidden w-14 text-right text-xs text-slate-500 sm:block">
                  {t("dashboard.leaderboard.gamesShort", {
                    count: p.totalMatches,
                  })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </DashboardCard>
  );
}
