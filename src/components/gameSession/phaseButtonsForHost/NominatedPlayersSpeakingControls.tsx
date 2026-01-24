"use client";

import React, { useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import {
  advanceToNextNominatedSpeaker,
  finishCurrentNominatedSpeaker,
} from "@/lib/dayPhase/actions";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { SPEAKING_STATE } from "@/lib/constants/game";

type Props = {
  gameSessionState: GameSessionState;
};

/**
 * Host controls for nominated players speaking phase.
 * Shows current speaker and allows advancing to the next nominated player.
 * Each nominated player gets 30 seconds for self-justification.
 * - "Finish Talking" when a speaker is active (mutes them, enters paused state)
 * - "Next Speaker →" when paused (unmutes next speaker)
 * - If foul elimination occurred, shows "Continue to Night Phase" after last speaker
 */
export default function NominatedPlayersSpeakingControls({
  gameSessionState,
}: Props) {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speaking_order ?? [];
  const currentSpeaker = gameSessionState.current_speaker_index ?? null;
  const nominatedPlayers = gameSessionState.nominated_players ?? [];

  // Check if foul elimination occurred this round
  // Type assertion needed until database types are regenerated
  const foulEliminationOccurred = (
    gameSessionState as unknown as { foul_elimination_occurred?: boolean }
  ).foul_elimination_occurred ?? false;

  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);

  // Get the actual speaker seat (decode from paused state if needed)
  const actualSpeakerSeat = isPaused
    ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker!)
    : currentSpeaker;

  // Calculate position in speaking order
  const currentPosition =
    actualSpeakerSeat !== null
      ? speakingOrder.indexOf(actualSpeakerSeat) + 1
      : 0;
  const totalSpeakers = speakingOrder.length;
  const isLastSpeaker = currentPosition === totalSpeakers;

  const handleFinish = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await finishCurrentNominatedSpeaker(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // advanceToNextNominatedSpeaker will automatically transition to night phase
      // if foul_elimination_occurred is true
      await advanceToNextNominatedSpeaker(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return (
      <div className="text-sm text-gray-400">No nominated players speaking</div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Foul elimination warning */}
      {foulEliminationOccurred && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center w-full">
          <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
            Player eliminated by fouls
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
            {isPaused
              ? "Continue to night phase - no more speakers will talk"
              : "Current speaker can finish, then continue to night phase - no more speakers will talk"}
          </p>
        </div>
      )}

      {/* Current speaker info */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg">
        <span className="text-xs text-orange-300">
          {isPaused ? "Paused after:" : "Self-Justification:"}
        </span>
        <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
          #{actualSpeakerSeat}
        </span>
        <span className="text-xs text-orange-200">
          ({currentPosition}/{totalSpeakers})
        </span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {nominatedPlayers.map((seat) => {
          const speakerPosition = speakingOrder.indexOf(seat);
          const hasSpoken = speakerPosition < currentPosition - 1;
          const isCurrent = seat === actualSpeakerSeat;

          return (
            <div
              key={seat}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isCurrent
                  ? isPaused
                    ? "bg-gray-500 text-white ring-2 ring-gray-400"
                    : "bg-orange-500 text-white ring-2 ring-orange-300"
                  : hasSpoken
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-gray-300"
              }`}
              title={
                isCurrent
                  ? isPaused
                    ? "Finished, waiting for next"
                    : "Currently speaking"
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

      {/* Control buttons */}
      {foulEliminationOccurred ? (
        // Foul elimination occurred - skip remaining speakers, go directly to night phase
        isPaused ? (
          // Paused state - show Continue to Night Phase button
          <button
            type="button"
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
            onClick={handleNext}
          >
            {isLoading ? "..." : "Continue to Night Phase →"}
          </button>
        ) : (
          // Active speaker - let them finish first
          <button
            type="button"
            className="rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
            onClick={handleFinish}
          >
            {isLoading ? "..." : "Finish Talking"}
          </button>
        )
      ) : (
        // Normal flow - no foul elimination
        isPaused ? (
          // Paused state - show Next Speaker button or Finish & Start Voting
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
        ) : (
          // Active speaker - show Finish Talking button
          <button
            type="button"
            className="rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
            onClick={handleFinish}
          >
            {isLoading ? "..." : "Finish Talking"}
          </button>
        )
      )}
    </div>
  );
}
