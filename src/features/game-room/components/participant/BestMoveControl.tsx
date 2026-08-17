"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { bestMove } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { SPORTS, GamePhase } from "@/shared/lib/constants/game";
import BestMoveIndicator from "./BestMoveIndicator";

/**
 * The Sports best-move suspect control for one participant tile
 * (docs/variants/sports/rules.md §6).
 *
 * A single centered round check button per tile:
 *  - the VICTIM gets an interactive circle they check / uncheck;
 *  - EVERYONE else — host, the other players, spectators — sees the identical
 *    circle, checked and inert, so the whole table can read the accusation.
 *
 * During `best_move` everyone is asleep, including the victim doing the picking
 * (§6.6) — so these controls render ABOVE the covered tiles, exactly as the Sports
 * mafia kill buttons do during `mafia_chooses_target`. A sleeping player therefore
 * sees the checks but no video, and the victim does not need to see a player in
 * order to check their tile.
 *
 * Never rendered on the victim's OWN tile: you cannot suspect yourself.
 *
 * Marks toggle freely while fewer than 3 are checked, so a mis-tap is
 * recoverable; the 3rd check LOCKS the set (the phase's completion signal) and
 * the remaining empty circles disappear, leaving only the three checks.
 *
 * Dead players stay checkable — a day-1 vote-out can be mafia, so naming them is
 * a legitimate best move.
 */

type BestMoveControlProps = {
  seatNumber: number | null;
  isTargetHost: boolean;
};

export default function BestMoveControl({
  seatNumber,
  isTargetHost,
}: BestMoveControlProps) {
  const { gameId, gameSessionState, nightPhaseSession, players, userId } =
    useGameRoom();
  const t = useTranslations("game.actions");
  const [isLoading, setIsLoading] = useState(false);
  const toggleSuspect = useMutation(bestMove.toggleSuspect);

  const viewerSeat = useMemo(
    () =>
      players.find((p) => (p.playerId as string) === userId)?.seatNumber ??
      null,
    [players, userId],
  );

  const isBestMovePhase = gameSessionState?.gamePhase === GamePhase.BEST_MOVE;
  const suspects = nightPhaseSession?.bestMoveSuspects ?? [];
  const victimSeat = nightPhaseSession?.bestMoveSeat ?? null;

  const isViewerVictim =
    victimSeat !== null && viewerSeat !== null && viewerSeat === victimSeat;
  const isChecked = seatNumber !== null && suspects.includes(seatNumber);
  const isLocked = suspects.length >= SPORTS.BEST_MOVE_SUSPECT_COUNT;

  const onToggle = useCallback(async () => {
    if (seatNumber === null || isLoading) return;
    if (isLocked && !isChecked) return; // locked: no new picks (server rejects too)
    setIsLoading(true);
    try {
      await toggleSuspect({ gameId: gameId as Id<"games">, seatNumber });
    } catch (error) {
      console.error("Error toggling best move suspect:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isLocked, isChecked, toggleSuspect]);

  if (!isBestMovePhase || seatNumber === null) return null;
  // The host tile is never a suspect, and neither is the victim's own tile.
  if (isTargetHost || seatNumber === victimSeat) return null;

  // The victim gets the interactive circle.
  if (isViewerVictim) {
    // Once the set is locked, only the three checked circles remain.
    if (isLocked && !isChecked) return null;
    return (
      <BestMoveIndicator
        isChecked={isChecked}
        isLoading={isLoading}
        label={isChecked ? t("bestMoveUncheck") : t("bestMoveCheck")}
        onToggle={() => {
          void onToggle();
        }}
      />
    );
  }

  // EVERYONE else — the host, the other players, and spectators — sees the checks
  // read-only. The tiles underneath are still covered (asleep, §6.6), so the check
  // is all a sleeping player sees: who was accused, but no video. Renders nothing
  // on unchecked tiles.
  return <BestMoveIndicator isChecked={isChecked} />;
}
