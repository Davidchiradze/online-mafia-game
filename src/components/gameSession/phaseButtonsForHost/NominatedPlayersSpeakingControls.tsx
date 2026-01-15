"use client";

import React, { useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import { advanceToNextNominatedSpeaker } from "@/lib/dayPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type Props = {
  gameSessionState: GameSessionState;
};

/**
 * Host controls for nominated players speaking phase.
 * Shows current speaker and allows advancing to the next nominated player.
 * Each nominated player gets 30 seconds for self-justification.
 */
export default function NominatedPlayersSpeakingControls({
  gameSessionState,
}: Props) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speaking_order ?? [];
  const currentSpeaker = gameSessionState.current_speaker_index ?? null;
  const nominatedPlayers = gameSessionState.nominated_players ?? [];

  // Calculate position in speaking order
  const currentPosition =
    currentSpeaker !== null ? speakingOrder.indexOf(currentSpeaker) + 1 : 0;
  const totalSpeakers = speakingOrder.length;
  const isLastSpeaker = currentPosition === totalSpeakers;

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await advanceToNextNominatedSpeaker(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        No nominated players speaking
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Current speaker info */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg">
        <span className="text-xs text-orange-300">Self-Justification:</span>
        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
          #{currentSpeaker}
        </span>
        <span className="text-xs text-orange-200">
          ({currentPosition}/{totalSpeakers})
        </span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {nominatedPlayers.map((seat, idx) => {
          const speakerPosition = speakingOrder.indexOf(seat);
          const hasSpoken = speakerPosition < currentPosition - 1;
          const isCurrent = seat === currentSpeaker;
          const isPending = speakerPosition >= currentPosition;

          return (
            <div
              key={seat}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isCurrent
                  ? "bg-orange-500 text-white ring-2 ring-orange-300"
                  : hasSpoken
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-gray-300"
              }`}
              title={
                isCurrent
                  ? "Currently speaking"
                  : hasSpoken
                  ? "Finished"
                  : "Waiting"
              }
            >
              {seat}
            </div>
          );
        })}
      </div>

      {/* Next button */}
      <button
        type="button"
        className={`rounded-md font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors ${
          isLastSpeaker
            ? "bg-green-600 hover:bg-green-500 text-white"
            : "bg-amber-600 hover:bg-amber-500 text-white"
        }`}
        disabled={isLoading}
        onClick={handleNext}
      >
        {isLoading
          ? "..."
          : isLastSpeaker
          ? "Finish & Start Voting →"
          : "Next Speaker →"}
      </button>
    </div>
  );
}

