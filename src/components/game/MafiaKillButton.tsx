"use client";

import { useState, useCallback } from "react";
import { selectMafiaTarget } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface MafiaKillButtonProps {
  /** The seat number of the target player */
  seatNumber: number;
  /** Whether this target is already selected */
  isSelected: boolean;
  /** Callback when target is successfully selected (for local state update) */
  onSuccess?: (seatNumber: number) => void;
}

/**
 * MafiaKillButton - Button shown to the mafia member with kill authority
 * during the mafia_chooses_target phase.
 *
 * Displayed in the center of each alive non-mafia player's tile.
 */
export default function MafiaKillButton({
  seatNumber,
  isSelected,
  onSuccess,
}: MafiaKillButtonProps) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTarget = useCallback(async () => {
    if (isLoading || isSelected) return;

    setIsLoading(true);
    try {
      const result = await selectMafiaTarget(gameId, seatNumber);
      if (result.ok) {
        // Update local state so the mafia player sees their selection immediately
        onSuccess?.(seatNumber);
      } else {
        console.error("Failed to select target:", result.message);
      }
    } catch (error) {
      console.error("Error selecting target:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isSelected, onSuccess]);

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
            ? "bg-red-600 text-white ring-4 ring-red-400 ring-opacity-50 cursor-default"
            : "bg-red-500/80 hover:bg-red-600 text-white hover:scale-110 cursor-pointer"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
        backdrop-blur-sm
      `}
      aria-label={isSelected ? "Target selected" : "Select as target"}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : isSelected ? (
        <span>💀</span>
      ) : (
        <span>🎯</span>
      )}
    </button>
  );
}
