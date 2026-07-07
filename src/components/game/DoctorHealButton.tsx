"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface DoctorHealButtonProps {
  seatNumber: number;
  isAlreadyHealed: boolean;
}

export default function DoctorHealButton({
  seatNumber,
  isAlreadyHealed,
}: DoctorHealButtonProps) {
  const t = useTranslations("game.actions");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const [hasHealed, setHasHealed] = useState(false);
  const healPlayerMutation = useMutation(nightPhase.healPlayer);

  const handleHeal = useCallback(async () => {
    if (isLoading || isAlreadyHealed || hasHealed) return;

    setIsLoading(true);
    try {
      await healPlayerMutation({
        gameId: gameId as Id<"games">,
        targetSeatNumber: seatNumber,
      });
      setHasHealed(true);
    } catch (error) {
      console.error("Error healing player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isAlreadyHealed, hasHealed, healPlayerMutation]);

  const isDisabled = isLoading || isAlreadyHealed || hasHealed;

  return (
    <button
      type="button"
      onClick={handleHeal}
      disabled={isDisabled}
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
          hasHealed
            ? "bg-emerald-500/30 border-emerald-400/30 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
            : isAlreadyHealed
              ? "bg-black/60 border-white/5 text-white/25 cursor-not-allowed"
              : "bg-black/75 border-emerald-400/15 text-emerald-200/70 hover:text-emerald-100 hover:border-emerald-400/30 hover:bg-black/70 cursor-pointer active:scale-95"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={
        hasHealed
          ? t("playerHealed")
          : isAlreadyHealed
            ? t("alreadyHealedThisGame")
            : t("heal")
      }
      title={isAlreadyHealed ? t("alreadyHealedThisGame") : undefined}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-emerald-300/20 border-t-emerald-300 rounded-full animate-spin" />
      ) : hasHealed ? (
        <span>{t("healed")}</span>
      ) : isAlreadyHealed ? (
        <span>{t("alreadyHealed")}</span>
      ) : (
        <span>{t("heal")}</span>
      )}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          hasHealed
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
            : isAlreadyHealed
              ? "bg-white/10"
              : "bg-emerald-400/30"
        }`}
      />
    </button>
  );
}
