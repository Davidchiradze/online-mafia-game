"use client";

import { Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import {
  factionForRole,
  factionIcon,
  factionBadgeClass,
} from "@/shared/lib/game/roleDisplay";
import type { Faction } from "@/shared/lib/constants/factions";
import { useRoleLabel } from "@/shared/lib/game/useRoleLabel";
import type { AdminGameLogRow } from "@convex/refs/admin";

export interface ArchiveRosterPanelProps {
  players: AdminGameLogRow["players"];
  gameType: AdminGameLogRow["gameType"];
  winner: Faction | null;
  expanded: boolean;
}

/**
 * The expandable roster inside an archive row. Split out of `ArchiveRow` when
 * that file reached the 200-line cap.
 *
 * Deliberately a near-twin of `match-history/MatchRosterPanel` rather than a
 * shared component: this one takes the roster it was already given, that one
 * lazy-loads a `gameLogs.getOne` detail on expand, and their row layouts differ
 * (seat chip, avatar, "you" marker). Folding them together would mean a
 * component that fetches only sometimes.
 */
export default function ArchiveRosterPanel({
  players,
  gameType,
  winner,
  expanded,
}: ArchiveRosterPanelProps) {
  const t = useTranslations("admin");
  const roleLabel = useRoleLabel();

  return (
    <div
      className={cn(
        "grid bg-[#0c0c12]/80 transition-[grid-template-rows,opacity] duration-300 ease-in-out",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div className="border-t border-white/5 px-7 py-6">
          <h4 className="mb-5 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
            <Users className="h-4 w-4 text-blue-400" /> {t("archive.roster")}
          </h4>

          <div className="grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
            {players.map((player) => {
              // Variant-aware, and `isWinner` is why it has to be: the
              // variant-blind map answers "citizens" for a Serial Killer, which
              // would both mis-colour the card and crown them on a citizen win.
              const faction = factionForRole(gameType, player.role);
              const Icon = factionIcon(faction);
              const isWinner = winner !== null && faction === winner;
              return (
                <div
                  key={player.playerId}
                  className="-mx-2 grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border-b border-white/5 px-2 py-2.5 transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 text-[11px] font-bold text-white shadow">
                      {player.nickname[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="truncate font-inter text-sm font-medium text-zinc-300">
                      {typeof player.seatNumber === "number" && (
                        <span className="mr-1 text-xs text-zinc-600">
                          #{player.seatNumber}
                        </span>
                      )}
                      {player.nickname}
                    </span>
                    {isWinner && (
                      <Trophy className="h-3.5 w-3.5 shrink-0 text-yellow-500/50" />
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      factionBadgeClass(faction),
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {roleLabel(player.role)}
                  </div>

                  <div className="flex w-16 items-center justify-end">
                    {player.isAlive ? (
                      <span className="text-xs font-bold uppercase tracking-widest text-[#2a5cff]">
                        {t("archive.alive")}
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-widest text-[#ff2a2a]">
                        {t("archive.dead")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
