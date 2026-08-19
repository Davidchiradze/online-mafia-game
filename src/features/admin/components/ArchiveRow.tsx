"use client";

import { useState } from "react";
import { ChevronDown, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { factionIcon, factionBadgeClass } from "@/shared/lib/game/roleDisplay";
import type { Faction } from "@/shared/lib/constants/factions";
import {
  formatDate,
  formatTime,
  formatDuration,
} from "@/shared/lib/format";
import type { AdminGameLogRow } from "@convex/refs/admin";
import ArchiveRosterPanel from "./ArchiveRosterPanel";
import ArchiveRowActions from "./ArchiveRowActions";

/**
 * TOTAL over `Faction`, not `Record<string, string>`. It was the loose version,
 * and a `serial_killer` win indexed to `undefined` — `winner` is truthy so the
 * fallback below never ran, and the row's accent bar rendered transparent. A
 * missing hue is now a compile error instead of an invisible one. Hues track
 * `FACTION_HEX`, in this file's neon register.
 */
const WINNER_BAR: Record<Faction, string> = {
  mafia: "bg-[#ff2a2a] shadow-[0_0_12px_rgba(255,42,42,0.6)]",
  yakuza: "bg-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.6)]",
  citizens: "bg-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.6)]",
  serial_killer: "bg-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.6)]",
};

export default function ArchiveRow({ row }: { row: AdminGameLogRow }) {
  const t = useTranslations("admin");
  const tg = useTranslations("game");
  const [expanded, setExpanded] = useState(false);

  const winner = row.winner;
  const WinnerIcon = winner ? factionIcon(winner) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-lg transition-colors duration-300",
        expanded
          ? "border-white/10 bg-[#13131a]"
          : "border-white/5 bg-[#13131a]/80 hover:border-white/20 hover:bg-[#1a1a24]",
      )}
    >
      {/* Winner indicator bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 top-0 w-[4px] transition-colors",
          winner ? WINNER_BAR[winner] : "bg-zinc-500",
        )}
      />

      <div
        onClick={() => setExpanded((v) => !v)}
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

        {/* Game name, mode, host, player count */}
        <div className="flex flex-col justify-center border-t border-white/5 pt-3 md:col-span-5 md:border-0 md:pt-0">
          <span className="mb-1.5 font-inter font-medium text-zinc-300">
            {row.gameName}{" "}
            <span className="text-sm text-zinc-600">{row.gameCode}</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-inter text-sm text-zinc-500">
            <span>
              {tg(`gameTypes.${row.gameType}` as Parameters<typeof tg>[0])}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {row.players.length}
            </span>
            <span>
              • {t("archive.host")}: {row.hostNickname}
            </span>
          </div>
        </div>

        {/* Winner */}
        <div className="flex items-center gap-3 md:col-span-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-orbitron text-sm font-bold tracking-widest",
              winner
                ? factionBadgeClass(winner)
                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
            )}
          >
            {WinnerIcon && <WinnerIcon className="h-4 w-4" />}
            {winner ? t(`archive.faction.${winner}`) : t("archive.noWinner")}
          </div>
          {row.winMethodLabel && (
            <span className="font-orbitron text-sm font-bold tracking-wider text-zinc-400">
              {row.winMethodLabel}
            </span>
          )}
        </div>

        {/* Actions menu + expand chevron */}
        <div className="absolute right-4 top-4 flex items-center gap-1 md:relative md:right-auto md:top-auto md:col-span-1 md:justify-end">
          <ArchiveRowActions gameLogId={row._id} hasWinner={winner !== null} />

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

      <ArchiveRosterPanel
        players={row.players}
        gameType={row.gameType}
        winner={winner}
        expanded={expanded}
      />
    </div>
  );
}
