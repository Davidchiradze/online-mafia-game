"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

interface SerialKillerKillButtonProps {
  seatNumber: number;
}

/**
 * The Serial Killer's one shot for the whole game
 * (docs/variants/serial_killer/rules.md §5).
 *
 * Amber-accented, matching the faction's chart hue, so it reads as neither the
 * mafia's black nor the yakuza's purple.
 *
 * NO SELECTED STATE, unlike `MafiaKillButton` and `YakuzaKillButton`. Those
 * carry an `isSelected` branch that renders a "TARGET" chip — which, at
 * `NightActionWrapper`'s `z-30`, paints on top of the `z-10` night cover. Here
 * the confirmation is `SerialKillIndicator` instead, gated on its audience, so
 * this button exists only while the shot is still unfired.
 *
 * Whether it appears at all is decided upstream by `checkSerialKillerAuthority`
 * — the server owns "is the shot still available", because that spans every
 * night of the game. This component only fires it.
 */
export default function SerialKillerKillButton({
  seatNumber,
}: SerialKillerKillButtonProps) {
  const t = useTranslations("game.actions");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const selectTarget = useMutation(nightPhase.selectSerialKillerTarget);

  const handleSelectTarget = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await selectTarget({
        gameId: gameId as Id<"games">,
        targetSeatNumber: seatNumber,
      });
    } catch (error) {
      console.error("Error selecting target:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, selectTarget]);

  return (
    <button
      type="button"
      onClick={handleSelectTarget}
      disabled={isLoading}
      className={`
        relative overflow-hidden
        flex items-center justify-center gap-1.5
        px-4 py-1.5 lg:px-5 lg:py-2
        rounded-t-lg
        text-[0.6rem] lg:text-[0.7rem]
        font-semibold uppercase tracking-widest
        transition duration-200
        border border-b-0
        bg-black/75 border-amber-400/15 text-amber-200/70
        hover:text-amber-100 hover:border-amber-400/30 hover:bg-black/70
        cursor-pointer active:scale-95
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={t("selectAsTarget")}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-amber-300/20 border-t-amber-300 rounded-full animate-spin" />
      ) : (
        <span>{t("kill")}</span>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400/30" />
    </button>
  );
}
