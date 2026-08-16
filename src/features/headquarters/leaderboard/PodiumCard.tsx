"use client";

import { useTranslations } from "next-intl";
import { Flame, Gamepad2, Target, Crown } from "lucide-react";
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

/** Gold / silver / bronze medal accents for the podium frames. */
const PODIUM_ACCENTS: Record<number, string> = {
  1: "#fbbf24",
  2: "#d4d4d8",
  3: "#d38a5a",
};

type PodiumCardProps = {
  player: LeaderboardRow;
  rank: number;
  isMe: boolean;
};

/**
 * Top-3 card: medal-colored frame, level-colored stats, and a crown on first.
 * Rank drives the desktop order (2nd — 1st — 3rd) rather than the DOM order, so
 * the champion sits in the centre while the markup stays ranked.
 */
export default function PodiumCard({ player, rank, isMe }: PodiumCardProps) {
  const t = useTranslations("leaderboard");
  const roleLabel = useRoleLabel();
  const level = getLevelForRating(player.rating);
  const progress = Math.round(getLevelProgress(player.rating) * 100);
  const toNext = pointsToNextLevel(player.rating);
  const accent = PODIUM_ACCENTS[rank];
  const isFirst = rank === 1;
  const currentStreak = player.currentStreak ?? 0;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[#17171f] to-[#101017] px-4 pb-4 shadow-xl transition-colors",
        isFirst ? "pt-7 sm:pb-6" : "pt-5",
        // On desktop the champion sits in the center: 2nd — 1st — 3rd.
        rank === 1 && "sm:order-2",
        rank === 2 && "sm:order-1",
        rank === 3 && "sm:order-3",
        isMe && "ring-1 ring-red-500/40",
      )}
      style={{ borderColor: `${accent}40` }}
    >
      {/* Medal-colored top line + glow behind the avatar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
      <div
        className="pointer-events-none absolute -top-14 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: level.hex }}
      />

      {/* Rank chip + level badge */}
      <div className="mb-2 flex items-start justify-between">
        <span
          className="flex items-center gap-1 rounded-md border px-2 py-0.5 font-orbitron text-sm font-bold"
          style={{
            color: accent,
            background: `${accent}14`,
            borderColor: `${accent}33`,
          }}
        >
          #{rank}
          {isMe && <YouChip />}
        </span>
        <LevelBadge
          level={level.level}
          size={isFirst ? "md" : "sm"}
          title={t("levelTooltip", { elo: player.rating, level: level.level })}
        />
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center text-center">
        {isFirst && (
          <Crown className="mb-1 h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        )}
        <div
          className="rounded-full border-2 p-[2px]"
          style={{
            borderColor: level.hex,
            boxShadow: `0 0 16px ${level.hex}55`,
          }}
        >
          <UserAvatar
            src={player.avatar}
            name={player.nickname}
            size={isFirst ? 72 : 56}
          />
        </div>
        <div
          className={cn(
            "mt-2 w-full truncate font-inter font-semibold text-white",
            isFirst ? "text-lg" : "text-base",
          )}
        >
          {player.nickname}
        </div>
        <div className={cn("font-inter text-xs", level.textClass)}>
          {t("level", { level: level.level })}
        </div>

        {/* ELO */}
        <div
          className={cn(
            "mt-2 font-orbitron font-bold leading-none",
            isFirst ? "text-3xl" : "text-2xl",
          )}
          style={{ color: level.hex, textShadow: `0 0 18px ${level.hex}55` }}
        >
          {player.rating}
        </div>
        <div className="mt-1 font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
          {t("peak", { elo: player.peakRating })}
        </div>
      </div>

      {/* Progress to next level */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: level.hex }}
          />
        </div>
        {toNext !== null && (
          <span className="shrink-0 font-inter text-[0.6rem] text-zinc-500">
            {t("toNextLevel", { points: toNext, level: level.level + 1 })}
          </span>
        )}
      </div>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 pt-3">
        <LeaderboardStat
          icon={<Target className="h-3 w-3" />}
          label={t("statWinRate")}
          value={`${player.winRate}%`}
          sub={t("record", { wins: player.wins, losses: player.losses })}
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
          sub={
            currentStreak >= 3
              ? t("onStreak", { count: currentStreak })
              : undefined
          }
        />
      </div>

      {/* Signature role */}
      {player.topRole && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
          <span className="font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
            {t("topRole")}
          </span>
          <span className="truncate font-inter text-xs font-medium text-zinc-300">
            {roleLabel(player.topRole.role)}
            <span className="ml-1.5 text-zinc-500">
              {player.topRole.winRate}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
