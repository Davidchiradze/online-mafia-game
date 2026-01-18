"use client";

import { useCallback } from "react";

type FoulSpeakButtonProps = {
  onStartFoulSpeak: () => void;
  isFoulSpeaking: boolean;
  foulSpeakTimeLeft: number;
  canFoulSpeak: boolean;
};

/**
 * Button for players to speak out of turn (foul speak).
 * When clicked, unmutes the player for 5 seconds.
 * Shows countdown when active.
 */
export default function FoulSpeakButton({
  onStartFoulSpeak,
  isFoulSpeaking,
  foulSpeakTimeLeft,
  canFoulSpeak,
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
        w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg font-bold text-sm
        ${
          isFoulSpeaking
            ? "bg-amber-500 border-amber-400 text-white animate-pulse"
            : canFoulSpeak
            ? "bg-black/50 border border-white/20 text-gray-300 hover:bg-amber-500/80 hover:border-amber-400 hover:text-white cursor-pointer hover:scale-110"
            : "bg-black/40 border border-white/10 text-gray-500 cursor-not-allowed opacity-50"
        }
      `}
    >
      {isFoulSpeaking ? (
        <span className="text-xs tabular-nums">{foulSpeakTimeLeft}</span>
      ) : (
        <span>!</span>
      )}
    </button>
  );
}
