"use client";

import { ChevronDown, Clock, Trophy, XCircle, MinusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { factionIcon, factionBadgeClass } from "@/shared/lib/game/roleDisplay";
import { useRoleLabel } from "@/shared/lib/game/useRoleLabel";
import { getLevelForRating } from "@/shared/lib/ranking/levels";
import LevelBadge from "@/components/ranking/LevelBadge";
import { formatDate, formatTime, formatDuration } from "@/shared/lib/format";
import MatchRosterPanel from "./MatchRosterPanel";
import type { GameLogRow } from "@convex/refs/history";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  row: GameLogRow;
  expanded: boolean;
  onToggle: () => void;
  currentPlayerId: Id<"profiles"> | undefined;
}

export default function MatchRow({
  row,
  expanded,
  onToggle,
  currentPlayerId,
}: Props) {
  const t = useTranslations("matchHistory");
  const tg = useTranslations("game");
  const roleLabel = useRoleLabel();
  const isWin = row.outcome === "win";
  const isNC = row.outcome === "no_contest";
  const RoleIcon = factionIcon(row.faction);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-lg transition-colors duration-300",
        expanded
          ? "border-white/10 bg-[#13131a]"
          : "border-white/5 bg-[#13131a]/80 hover:border-white/20 hover:bg-[#1a1a24]",
      )}
    >
      {/* Result indicator bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 top-0 w-[4px] transition-colors",
          isWin
            ? "bg-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.6)]"
            : isNC
              ? "bg-zinc-500"
              : "bg-[#ff2a2a] shadow-[0_0_12px_rgba(255,42,42,0.6)]",
        )}
      />

      <div
        onClick={onToggle}
        className="grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-4 p-5 pl-7 md:grid-cols-12"
      >
        {/* Date & time */}
        <div className="flex flex-col justify-center md:col-span-3">
          <span className="mb-1 font-inter font-semibold text-zinc-100">
            {formatDate(row.finishedAt)}
          </span>
          <span className="flex items-center gap-1.5 font-inter text-sm text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> {formatTime(row.finishedAt)} •{" "}
            {formatDuration(row.startedAt, row.finishedAt)}
          </span>
        </div>

        {/* Operation & role */}
        <div className="flex flex-col justify-center border-t border-white/5 pt-3 md:col-span-5 md:border-0 md:pt-0">
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="truncate font-inter font-semibold text-zinc-100">
              {row.gameName}
            </span>
            <span className="shrink-0 font-inter text-xs text-zinc-500">
              {tg(`gameTypes.${row.gameType}` as Parameters<typeof tg>[0])}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-inter text-sm text-zinc-500">{t("assigned")}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                factionBadgeClass(row.faction),
              )}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {roleLabel(row.role)}
            </span>
          </div>
        </div>

        {/* Outcome */}
        <div className="flex items-center gap-3 md:col-span-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-orbitron text-sm font-bold tracking-widest",
              isWin
                ? "border-[#00ff66]/30 bg-[#00ff66]/10 text-[#00ff66]"
                : isNC
                  ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                  : "border-[#ff2a2a]/30 bg-[#ff2a2a]/10 text-[#ff2a2a]",
            )}
          >
            {isWin ? (
              <Trophy className="h-4 w-4" />
            ) : isNC ? (
              <MinusCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isWin ? t("victory") : isNC ? t("noContest") : t("defeat")}
          </div>
          {row.ratingDelta !== undefined && (
            <span
              className={cn(
                "font-orbitron text-sm font-bold tracking-wider",
                row.ratingDelta > 0
                  ? "text-[#00ff66]"
                  : row.ratingDelta < 0
                    ? "text-[#ff2a2a]"
                    : "text-zinc-400",
              )}
            >
              {row.ratingDelta > 0 ? `+${row.ratingDelta}` : row.ratingDelta}
            </span>
          )}
          {row.tableAvgRating !== undefined && (
            <div
              className="flex items-center gap-2"
              title={t("tableAvgTooltip", { avg: row.tableAvgRating })}
            >
              <LevelBadge
                level={getLevelForRating(row.tableAvgRating).level}
                size="sm"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
                  {t("tableAvgLabel")}
                </span>
                <span className="font-orbitron text-xs font-bold text-zinc-300">
                  {row.tableAvgRating}
                </span>
              </div>
            </div>
          )}
          {row.winMethodLabel && (
            <span className="font-orbitron text-sm font-bold tracking-wider text-zinc-400">
              {row.winMethodLabel}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <div className="absolute right-5 top-5 flex justify-end md:relative md:right-auto md:top-auto md:col-span-1">
          <div
            className={cn(
              "rounded-full border p-1.5 transition-colors duration-300",
              expanded
                ? "border-white/20 bg-white/10 text-white"
                : "border-transparent text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300",
            )}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </div>

      <MatchRosterPanel
        gameLogId={row.gameLogId}
        expanded={expanded}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
}
