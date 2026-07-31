"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { gameRoles } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

interface PromoteToRightHandButtonProps {
  targetPlayerId: Id<"profiles">;
}

/**
 * Tile-level button shown only to the Don on each MAFIA tile during
 * `don_chooses_right_hand`. Single-shot: once clicked successfully the
 * promotion is immutable for the rest of the phase, and the gating hook
 * `useRightHandPromotion` will hide this button on every tile from then on.
 *
 * Style mirrors the night-action buttons (kill / heal) for visual parity.
 * Uses an amber/gold accent to evoke the Don's authority.
 */
export default function PromoteToRightHandButton({
  targetPlayerId,
}: PromoteToRightHandButtonProps) {
  const t = useTranslations("game.actions");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const promote = useMutation(gameRoles.promoteToRightHand);

  const handlePromote = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await promote({
        gameId: gameId as Id<"games">,
        targetPlayerId,
      });
    } catch (error) {
      console.error("Error promoting to Right Hand:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, targetPlayerId, isLoading, promote]);

  return (
    <button
      type="button"
      onClick={handlePromote}
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
        bg-black/75 border-amber-400/20 text-amber-200/80
        hover:text-amber-100 hover:border-amber-400/40 hover:bg-black/70
        cursor-pointer active:scale-95
        ${isLoading ? "opacity-50 cursor-wait" : ""}
      `}
      aria-label={t("promoteToRightHand")}
    >
      {isLoading ? (
        <span className="w-3 h-3 border-[1.5px] border-amber-300/20 border-t-amber-300 rounded-full animate-spin" />
      ) : (
        <span>{t("promote")}</span>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400/40" />
    </button>
  );
}
