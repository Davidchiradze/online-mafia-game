"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { SPORTS } from "@/shared/lib/constants/game";
import PhaseAdvanceButton from "./PhaseAdvanceButton";

type Props = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

const SLOTS = Array.from(
  { length: SPORTS.BEST_MOVE_SUSPECT_COUNT },
  (_, i) => i,
);

/**
 * Host controls for `best_move` (docs/sports-mafia.md §6.3).
 *
 * Shows which seats the killed player has named so far, then ONE button whose
 * label morphs with progress:
 *
 *   < 3 marked  → "Skip Best Move"        (still choosing, or AFK/disconnected)
 *   3 marked    → "Start Farewell Speech" (the set is locked)
 *
 * The button is **always enabled** either way — that is the deadlock guard: an
 * AFK or disconnected victim can never stall the game, and skipping just keeps
 * whatever partial set exists. The destination (`farewell_speech`) comes from the
 * resolved variant's graph via `PhaseAdvanceButton`, so there is no bespoke
 * advance path here.
 */
export default function BestMoveControls({ gameSessionState }: Props) {
  const t = useTranslations("game.host");
  const { nightPhaseSession } = useGameRoom();

  const suspects = nightPhaseSession?.bestMoveSuspects ?? [];
  const victimSeat = nightPhaseSession?.bestMoveSeat ?? null;
  const isComplete = suspects.length >= SPORTS.BEST_MOVE_SUSPECT_COUNT;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Which seats have been named, in pick order. */}
      <div className="flex gap-1.5">
        {SLOTS.map((i) => {
          const seat = suspects[i];
          const isFilled = seat !== undefined;
          return (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                isFilled
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/60"
                  : "bg-white/5 text-white/30 border-white/15 border-dashed"
              }`}
            >
              {isFilled ? seat : "?"}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm">
        {victimSeat !== null && !isComplete && (
          <>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full text-xs border border-amber-500/30">
              #{victimSeat}
            </span>
            <span className="text-white/50">
              {t("bestMoveChoosing", {
                count: suspects.length,
                total: SPORTS.BEST_MOVE_SUSPECT_COUNT,
              })}
            </span>
          </>
        )}
        {isComplete && (
          <span className="text-white/50">{t("bestMoveComplete")}</span>
        )}
      </div>

      <PhaseAdvanceButton
        gameSessionState={gameSessionState}
        sourcePhase="best_move"
        labelKey={isComplete ? "startFarewellSpeech" : "skipBestMove"}
        variant={isComplete ? "success" : "primary"}
      />
    </div>
  );
}
