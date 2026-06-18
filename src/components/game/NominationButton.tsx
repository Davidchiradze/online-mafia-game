"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type NominationButtonProps = {
  seatNumber: number;
  isNominated: boolean;
};

/**
 * Nomination button visible only to the host during DAY_PHASE.
 * Clicking nominates the player (or un-nominates if already nominated).
 */
export default function NominationButton({
  seatNumber,
  isNominated,
}: NominationButtonProps) {
  const t = useTranslations("game.nomination");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const nominateMutation = useMutation(dayPhase.nominatePlayer);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading) return;
      setIsLoading(true);
      try {
        await nominateMutation({ gameId: gameId as Id<"games">, seatNumber });
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, seatNumber, isLoading, nominateMutation]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isNominated ? t("removeNomination") : t("nominatePlayer")}
      title={isNominated ? t("clickToRemoveNomination") : t("clickToNominate")}
      className={`
        w-5 h-5 tsm:w-6 tsm:h-6 tmd:w-8 tmd:h-8 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg
        ${
          isLoading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:scale-110"
        }
        ${
          isNominated
            ? "bg-red-500 border-red-400 text-white"
            : "bg-black/50 border-white/20 text-gray-300 hover:bg-red-500/80 hover:border-red-400 hover:text-white"
        }
      `}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-3 w-3 tsm:h-4 tsm:w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-2.5 h-2.5 tsm:w-3 tsm:h-3 tmd:w-4 tmd:h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      )}
    </button>
  );
}
