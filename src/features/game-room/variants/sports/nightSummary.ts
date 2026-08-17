"use client";

/**
 * Sports host night summary (docs/variants/sports/rules.md §5).
 *
 * The Sports night is the `unanimous-vote` model: EVERY living mafia privately
 * picks a target inside a timed window, so there is no single scalar to show —
 * there is one pick per mafia, and they are server-private (§5.4). Only the
 * host may see them, via the host-only `getHostSelections` query, which is why
 * this is a hook and not a pure derivation.
 *
 * Each pill pairs the mafia's seat with their target and carries a crosshair,
 * so `#2 ⌖ #7` reads as "seat 2 is killing seat 7" rather than as two seats.
 */

import { useQuery } from "convex/react";
import { sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";
import { GamePhase } from "@/shared/lib/constants/game";

const NIGHT_PHASES: readonly string[] = [
  GamePhase.MAFIA_CHOOSES_TARGET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
];

const EMPTY: readonly HostPanelMeta[] = [];

export function useSportsNightSummary(): readonly HostPanelMeta[] {
  const { gameId, gameSessionState, isHost } = useGameRoom();

  const phase = gameSessionState?.gamePhase;
  const inNightPhase = phase !== undefined && NIGHT_PHASES.includes(phase);

  const selections = useQuery(
    sportsNightPhase.getHostSelections,
    isHost && inNightPhase ? { gameId: gameId as Id<"games"> } : "skip",
  );

  if (!isHost || !inNightPhase || !selections) return EMPTY;

  const isChoosing = phase === GamePhase.MAFIA_CHOOSES_TARGET;

  return selections.map(({ mafiaSeat, targetSeat }) => ({
    id: `mafia-${String(mafiaSeat)}`,
    label: `#${String(mafiaSeat)}`,
    value: targetSeat === null ? "—" : `#${String(targetSeat)}`,
    tone: "rose" as const,
    isActive: isChoosing,
    icon: "target" as const,
  }));
}
