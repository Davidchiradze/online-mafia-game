"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import Skull from "@/assets/icons/Skull";

interface YakuzaKillButtonProps {
  seatNumber: number;
  isSelected: boolean;
}

/**
 * YakuzaKillButton — purple-accented glass tab for yakuza target selection.
 * Authority: SHOGUN (if YAKUZA alive) > YAKUZA (if SHOGUN dead).
 */
export default function YakuzaKillButton({
  seatNumber,
  isSelected,
}: YakuzaKillButtonProps) {
  const t = useTranslations("game.actions");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const selectTarget = useMutation(nightPhase.selectYakuzaTarget);

  const handleSelectTarget = useCallback(async () => {
    if (isLoading || isSelected) return;

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
  }, [gameId, seatNumber, isLoading, isSelected, selectTarget]);

  return (
    <button
      type="button"
      onClick={handleSelectTarget}
      disabled={isLoading || isSelected}
      className={`
        relative overflow-hidden
        flex items-center justify-center gap-1.5
        px-4 py-1.5 lg:px-5 lg:py-2
        rounded-t-lg
        text-[0.6rem] lg:text-[0.7rem]
        font-semibold uppercase tracking-widest
        transition duration-200
        border border-b-0
        ${
          isSelected
            ? "bg-purple-500/30 border-purple-400/30 text-purple-100 shadow-[0_0_16px_rgba(168,85,247,0.2)]"
            : "bg-black/75 border-purple-400/15 text-purple-200/70 hover:text-purple-100 hover:border-purple-400/30 hover:bg-black/70 cursor-pointer active:scale-95"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={isSelected ? t("targetSelected") : t("selectAsTarget")}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-purple-300/20 border-t-purple-300 rounded-full animate-spin" />
      ) : isSelected ? (
        <>
          <Skull size={11} className="text-purple-200" />
          <span>{t("target")}</span>
        </>
      ) : (
        <span>{t("kill")}</span>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          isSelected
            ? "bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.6)]"
            : "bg-purple-400/30"
        }`}
      />
    </button>
  );
}
