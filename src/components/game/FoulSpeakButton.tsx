"use client";

import { useCallback } from "react";
import { FoulAlertIcon } from "@/assets/icons";

type FoulSpeakButtonProps = {
  onStartFoulSpeak: () => void;
  isFoulSpeaking: boolean;
  foulSpeakTimeLeft: number;
  canFoulSpeak: boolean;
  currentFouls: number;
};

/**
 * Button for players to speak out of turn (foul speak).
 * When clicked, unmutes the player for 5 seconds.
 * Shows countdown when active, X icon + foul count badge when idle.
 */
export default function FoulSpeakButton({
  onStartFoulSpeak,
  isFoulSpeaking,
  foulSpeakTimeLeft,
  canFoulSpeak,
  currentFouls,
}: FoulSpeakButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canFoulSpeak) return;
      onStartFoulSpeak();
    },
    [canFoulSpeak, onStartFoulSpeak]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canFoulSpeak}
      aria-label={
        isFoulSpeaking
          ? `Speaking: ${foulSpeakTimeLeft}s left`
          : "Speak with foul"
      }
      title={
        isFoulSpeaking
          ? `${foulSpeakTimeLeft}s remaining`
          : "Click to speak for 5 seconds"
      }
      className={`
        relative w-5 h-5 tsm:w-6 tsm:h-6 tmd:w-8 tmd:h-8 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg
        ${
          isFoulSpeaking
            ? "bg-amber-500 border border-amber-400 text-white animate-pulse"
            : canFoulSpeak
            ? "bg-black/50 border border-white/20 text-white/80 hover:bg-red-600/80 hover:border-red-400 hover:text-white cursor-pointer hover:scale-110"
            : "bg-black/40 border border-white/10 text-white/40 cursor-not-allowed opacity-50"
        }
      `}
    >
      {isFoulSpeaking ? (
        <span className="text-[10px] tsm:text-xs font-bold tabular-nums">{foulSpeakTimeLeft}</span>
      ) : (
        <FoulAlertIcon className="w-3 h-3 tsm:w-3.5 tsm:h-3.5 tmd:w-4 tmd:h-4" />
      )}
      {currentFouls > 0 && !isFoulSpeaking && (
        <span className="absolute -top-1 -right-1 w-3 h-3 tsm:w-4 tsm:h-4 rounded-full bg-red-600 text-white text-[7px] tsm:text-[9px] font-bold flex items-center justify-center shadow-sm">
          {currentFouls}
        </span>
      )}
    </button>
  );
}
