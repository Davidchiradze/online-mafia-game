"use client";

import { useState, useCallback } from "react";
import { selectYakuzaTarget } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface YakuzaKillButtonProps {
  /** The seat number of the target player */
  seatNumber: number;
  /** Whether this target is already selected */
  isSelected: boolean;
}

/**
 * YakuzaKillButton - Button shown to the Yakuza team member with kill authority
 * during the yakuza_and_shogun_chooses_target phase.
 * Authority: SHOGUN (if YAKUZA alive) > YAKUZA (if SHOGUN dead).
 *
 * Displayed in the center of each alive non-Yakuza-team player's tile.
 * Uses a purple/violet theme to distinguish from Mafia's red theme.
 */
export default function YakuzaKillButton({
  seatNumber,
  isSelected,
}: YakuzaKillButtonProps) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTarget = useCallback(async () => {
    if (isLoading || isSelected) return;

    setIsLoading(true);
    try {
      const result = await selectYakuzaTarget(gameId, seatNumber);
      if (!result.ok) {
        console.error("Failed to select target:", result.message);
      }
    } catch (error) {
      console.error("Error selecting target:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isSelected]);

  return (
    <button
      type="button"
      onClick={handleSelectTarget}
      disabled={isLoading || isSelected}
      className={`
        flex items-center justify-center
        w-12 h-12 md:w-16 md:h-16
        rounded-full
        font-bold text-lg md:text-xl
        transition-all duration-200
        shadow-lg
        ${
          isSelected
            ? "bg-violet-600 text-white ring-4 ring-violet-400 ring-opacity-50 cursor-default"
            : "bg-violet-500/80 hover:bg-violet-600 text-white hover:scale-110 cursor-pointer"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
        backdrop-blur-sm
      `}
      aria-label={isSelected ? "Target selected" : "Select as target"}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : isSelected ? (
        <span>⚔️</span>
      ) : (
        <span>🗡️</span>
      )}
    </button>
  );
}
