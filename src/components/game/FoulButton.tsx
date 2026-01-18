"use client";

import { useCallback, useState } from "react";
import { giveFoul } from "@/lib/dayPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { FOULS } from "@/lib/constants/game";

type FoulButtonProps = {
  seatNumber: number;
  currentFouls: number;
};

/**
 * Foul button visible only to the host during DAY_PHASE.
 * Clicking gives a foul to the player.
 */
export default function FoulButton({
  seatNumber,
  currentFouls,
}: FoulButtonProps) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading) return;
      if (currentFouls >= FOULS.MAX_FOULS) return;
      setIsLoading(true);
      try {
        await giveFoul(gameId, seatNumber);
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, seatNumber, isLoading, currentFouls]
  );

  const isMaxFouls = currentFouls >= FOULS.MAX_FOULS;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || isMaxFouls}
      aria-label="Give foul"
      title={isMaxFouls ? "Player has max fouls" : "Give foul to player"}
      className={`
        w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg font-bold text-sm bg-black/50 border-white/20 text-gray-300 hover:bg-amber-500/80 hover:border-amber-400 hover:text-white
        ${
          isLoading || isMaxFouls
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:scale-110"
        }
        ""
      `}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
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
        <span>!</span>
      )}
    </button>
  );
}
