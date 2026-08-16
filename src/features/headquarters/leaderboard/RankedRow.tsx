"use client";

import { useTranslations } from "next-intl";
import { Flame, Gamepad2, Target } from "lucide-react";
import type { LeaderboardRow } from "@convex/refs/leaderboard";
import { cn } from "@/shared/lib/cn";
import UserAvatar from "@/shared/ui/UserAvatar";
import LevelBadge from "@/shared/ui/LevelBadge";
import { useRoleLabel } from "@/shared/lib/game/useRoleLabel";
import {
  getLevelForRating,
  getLevelProgress,
  pointsToNextLevel,
} from "@/shared/lib/ranking/levels";
import YouChip from "./YouChip";
import LeaderboardStat from "./LeaderboardStat";
import LeaderboardRowStat from "./LeaderboardRowStat";

type RankedRowProps = {
  player: LeaderboardRow;
  rank: number;
  isMe: boolean;
};

/**
 * Ranked entry below the podium, in the match-history row style: left accent
 * bar keyed to level color, stats in fixed columns. The stats render twice —
 * fixed columns on desktop, a stacked strip on mobile — so the row stays
 * scannable at both widths.
 */
export default function RankedRow({ player, rank, isMe }: RankedRowProps) {
  const t = useTranslations("leaderboard");
  const roleLabel = useRoleLabel();
  const level = getLevelForRating(player.rating);
  const progress = Math.round(getLevelProgress(player.rating) * 100);
  const toNext = pointsToNextLevel(player.rating);
  const currentStreak = player.currentStreak ?? 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-lg transition-colors duration-300",
        isMe
          ? "border-red-500/40 bg-red-950/15"
          : "border-white/5 bg-[#13131a]/80 hover:border-white/20 hover:bg-[#1a1a24]",
      )}
    >
      {/* Level-colored accent bar */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: level.hex, boxShadow: `0 0 10px ${level.hex}66` }}
      />

      <div className="flex items-center gap-3 p-3 pl-5 sm:gap-4 sm:p-4 sm:pl-6">
        {/* Rank */}
        <span className="w-9 shrink-0 text-center font-orbitron text-sm font-bold text-zinc-500">
          #{rank}
        </span>

        {/* Identity */}
        <div
          className="shrink-0 rounded-full border-2 p-[2px]"
          style={{
            borderColor: level.hex,
            boxShadow: `0 0 10px ${level.hex}44`,
          }}
        >
          <UserAvatar src={player.avatar} name={player.nickname} size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-inter text-sm font-semibold text-white">
              {player.nickname}
            </span>
            {isMe && <YouChip />}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("font-inter text-xs", level.textClass)}>
              {t("level", { level: level.level })}
            </span>
            {player.topRole && (
              <span className="hidden truncate font-inter text-xs text-zinc-500 xl:inline">
                · {roleLabel(player.topRole.role)} {player.topRole.winRate}%
              </span>
            )}
          </div>
        </div>

        {/* Progress to next level */}
        <div
          className="hidden w-32 flex-col gap-1 lg:flex"
          title={
            toNext !== null
              ? t("toNextLevel", { points: toNext, level: level.level + 1 })
              : undefined
          }
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: level.hex }}
            />
          </div>
          {toNext !== null && (
            <span className="font-inter text-[0.6rem] text-zinc-500">
              {t("toNextLevel", { points: toNext, level: level.level + 1 })}
            </span>
          )}
        </div>

        {/* Stats (desktop) */}
        <div className="hidden items-center md:flex">
          <LeaderboardRowStat
            label={t("statWinRate")}
            value={`${player.winRate}%`}
            title={t("record", { wins: player.wins, losses: player.losses })}
          />
          <LeaderboardRowStat
            label={t("statMatches")}
            value={String(player.totalMatches ?? 0)}
          />
          <LeaderboardRowStat
            label={t("statBestStreak")}
            value={String(player.bestStreak ?? 0)}
            highlight={currentStreak >= 3}
            title={
              currentStreak >= 3
                ? t("onStreak", { count: currentStreak })
                : undefined
            }
          />
        </div>

        {/* Level + ELO */}
        <LevelBadge
          level={level.level}
          size="sm"
          className="hidden sm:inline-flex"
          title={t("levelTooltip", { elo: player.rating, level: level.level })}
        />
        <div className="w-16 shrink-0 text-right">
          <div
            className="font-orbitron text-lg font-bold leading-none"
            style={{ color: level.hex }}
          >
            {player.rating}
          </div>
          <div className="mt-1 font-inter text-[0.55rem] uppercase tracking-wider text-zinc-500">
            {t("peak", { elo: player.peakRating })}
          </div>
        </div>
      </div>

      {/* Stats (mobile) */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 py-2 pl-5 md:hidden">
        <LeaderboardStat
          icon={<Target className="h-3 w-3" />}
          label={t("statWinRate")}
          value={`${player.winRate}%`}
        />
        <LeaderboardStat
          icon={<Gamepad2 className="h-3 w-3" />}
          label={t("statMatches")}
          value={String(player.totalMatches ?? 0)}
        />
        <LeaderboardStat
          icon={<Flame className="h-3 w-3" />}
          label={t("statBestStreak")}
          value={String(player.bestStreak ?? 0)}
          highlight={currentStreak >= 3}
        />
      </div>
    </div>
  );
}
