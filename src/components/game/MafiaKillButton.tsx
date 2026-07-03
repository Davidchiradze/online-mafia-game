"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import Skull from "@/assets/icons/Skull";

interface MafiaKillButtonProps {
  seatNumber: number;
  isSelected: boolean;
}

export default function MafiaKillButton({
  seatNumber,
  isSelected,
}: MafiaKillButtonProps) {
  const t = useTranslations("game.actions");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const selectTarget = useMutation(nightPhase.selectMafiaTarget);

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
            ? "bg-white/10 backdrop-blur-md border-white/20 text-white shadow-[0_0_16px_rgba(255,255,255,0.15)]"
            : "bg-black/60 backdrop-blur-md border-white/10 text-white/80 hover:text-white hover:border-white/20 hover:bg-black/70 cursor-pointer active:scale-95"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={isSelected ? t("targetSelected") : t("selectAsTarget")}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-white/20 border-t-white rounded-full animate-spin" />
      ) : isSelected ? (
        <>
          <Skull size={11} className="text-white/90" />
          <span>{t("target")}</span>
        </>
      ) : (
        <span>{t("kill")}</span>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          isSelected
            ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]"
            : "bg-white/30"
        }`}
      />
    </button>
  );
}
