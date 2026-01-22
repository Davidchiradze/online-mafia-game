"use client";

import { useCallback, useState } from "react";
import { nominatePlayer } from "@/lib/dayPhase/actions";
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
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading) return;
      setIsLoading(true);
      try {
        await nominatePlayer(gameId, seatNumber);
      } finally {
        setIsLoading(false);
      }
    },
    [gameId, seatNumber, isLoading]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isNominated ? "Remove nomination" : "Nominate player"}
      title={isNominated ? "Click to remove nomination" : "Click to nominate"}
      className={`
        w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
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
        <svg
          className="w-3 h-3 md:w-4 md:h-4"
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
