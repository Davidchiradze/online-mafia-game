"use client";

import { useState, useCallback } from "react";
import { healPlayer } from "@/lib/nightPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface DoctorHealButtonProps {
  /** The seat number of the target player */
  seatNumber: number;
  /** Whether this player has already been healed (disabled state) */
  isAlreadyHealed: boolean;
}

/**
 * DoctorHealButton - Button shown to the Doctor
 * during the doctor_heals_player phase.
 *
 * Displayed in the center of each alive player's tile (except already healed ones).
 * Uses a green/emerald theme to represent healing.
 */
export default function DoctorHealButton({
  seatNumber,
  isAlreadyHealed,
}: DoctorHealButtonProps) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const [hasHealed, setHasHealed] = useState(false);

  const handleHeal = useCallback(async () => {
    if (isLoading || isAlreadyHealed || hasHealed) return;

    setIsLoading(true);
    try {
      const result = await healPlayer(gameId, seatNumber);
      if (!result.ok) {
        console.error("Failed to heal player:", result.message);
      } else {
        setHasHealed(true);
      }
    } catch (error) {
      console.error("Error healing player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isAlreadyHealed, hasHealed]);

  const isDisabled = isLoading || isAlreadyHealed || hasHealed;

  return (
    <button
      type="button"
      onClick={handleHeal}
      disabled={isDisabled}
      className={`
        flex items-center justify-center
        w-12 h-12 md:w-16 md:h-16
        rounded-full
        font-bold text-lg md:text-xl
        transition-all duration-200
        shadow-lg
        ${
          hasHealed
            ? "bg-emerald-600 text-white ring-4 ring-emerald-400 ring-opacity-50 cursor-default"
            : isAlreadyHealed
            ? "bg-gray-500/50 text-gray-300 cursor-not-allowed"
            : "bg-emerald-500/80 hover:bg-emerald-600 text-white hover:scale-110 cursor-pointer"
        }
        ${isLoading ? "opacity-50 cursor-wait" : ""}
        backdrop-blur-sm
      `}
      aria-label={
        hasHealed
          ? "Player healed"
          : isAlreadyHealed
          ? "Already healed this game"
          : "Heal this player"
      }
      title={isAlreadyHealed ? "Already healed this game" : undefined}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : hasHealed ? (
        <span>💚</span>
      ) : (
        <span>💉</span>
      )}
    </button>
  );
}
