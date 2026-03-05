"use client";

import { useCallback, useState } from "react";
import { giveFoul } from "@/lib/dayPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { FOULS } from "@/lib/constants/game";
import { FoulXIcon } from "@/assets/icons";
import FoulEliminationModal from "./FoulEliminationModal";

type FoulButtonProps = {
  seatNumber: number;
  currentFouls: number;
};

/**
 * Foul button visible only to the host during allowed phases.
 * Clicking gives a foul to the player.
 * On 4th foul, shows confirmation modal before eliminating the player.
 */
export default function FoulButton({
  seatNumber,
  currentFouls,
}: FoulButtonProps) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);

  // Check if this would be the 4th (elimination) foul
  const wouldBeEliminationFoul = currentFouls === FOULS.MAX_FOULS;
  
  // Player is already eliminated by fouls (4+ fouls)
  const isAlreadyEliminated = currentFouls >= FOULS.ELIMINATION_THRESHOLD;

  const handleGiveFoul = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await giveFoul(gameId, seatNumber);
    } finally {
      setIsLoading(false);
      setShowEliminationModal(false);
    }
  }, [gameId, seatNumber, isLoading]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLoading || isAlreadyEliminated) return;
      
      // If this would be the 4th foul, show confirmation modal
      if (wouldBeEliminationFoul) {
        setShowEliminationModal(true);
        return;
      }
      
      // Otherwise, give foul directly
      handleGiveFoul();
    },
    [isLoading, isAlreadyEliminated, wouldBeEliminationFoul, handleGiveFoul]
  );

  const getButtonTitle = () => {
    if (isAlreadyEliminated) return "Player eliminated by fouls";
    if (wouldBeEliminationFoul) return "4th foul will eliminate player";
    return "Give foul to player";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isAlreadyEliminated}
        aria-label="Give foul"
        title={getButtonTitle()}
        className={`
          relative w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg bg-black/50 border border-white/20 hover:bg-red-600/70 hover:border-red-400
          ${
            isLoading || isAlreadyEliminated
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:scale-110"
          }
          ${wouldBeEliminationFoul ? "ring-2 ring-amber-500/50" : ""}
        `}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-gray-300"
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
          <FoulXIcon
            width="14"
            height="14"
            className="drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]"
          />
        )}
        {currentFouls > 0 && !isLoading && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
            {currentFouls}
          </span>
        )}
      </button>

      <FoulEliminationModal
        open={showEliminationModal}
        onClose={() => setShowEliminationModal(false)}
        onConfirm={handleGiveFoul}
        isEliminating={isLoading}
        seatNumber={seatNumber}
      />
    </>
  );
}
