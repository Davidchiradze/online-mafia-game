"use client";

import React, { useState, useCallback, useMemo } from "react";
import { GameSessionState } from "@/types/game/type";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  grantFarewellTime,
  markDeadAndAdvance,
} from "@/lib/farewellSpeech/actions";

type Props = {
  gameSessionState: GameSessionState;
};

/**
 * Host controls for farewell speech phase.
 *
 * Flow for each dying player:
 * 1. Host clicks "Grant 1 Minute" → player can speak (timer starts)
 * 2. Host clicks "Mark as Dead & Next" → player marked dead, advance to next or day_phase
 *
 * The order of speakers is randomized so players don't know
 * who was killed by mafia vs yakuza.
 */
export default function FarewellSpeechControls({ gameSessionState }: Props) {
  const { gameId, players } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speaking_order ?? [];
  const currentSpeaker = gameSessionState.current_speaker_index;
  const speakerStartedAt = gameSessionState.speaker_started_at;

  // Determine which speakers have completed (are dead) and which remain (alive)
  const { completedSpeakers, remainingSpeakers } = useMemo(() => {
    const completed: number[] = [];
    const remaining: number[] = [];

    for (const seat of speakingOrder) {
      const player = players?.find((p) => p.seat_number === seat);
      if (player?.is_alive === false) {
        completed.push(seat);
      } else {
        remaining.push(seat);
      }
    }

    return { completedSpeakers: completed, remainingSpeakers: remaining };
  }, [speakingOrder, players]);

  // Check if we're waiting for host to grant time
  const waitingForGrant =
    currentSpeaker === null && remainingSpeakers.length > 0;

  // Check if speaker is actively speaking (has been granted time)
  const speakerIsActive = currentSpeaker !== null && speakerStartedAt !== null;

  // Get the next speaker who needs time granted
  const nextSpeakerToGrant = remainingSpeakers[0];

  // Check if current speaker is the last one
  const isLastSpeaker =
    currentSpeaker !== null &&
    speakingOrder.indexOf(currentSpeaker) === speakingOrder.length - 1;

  const handleGrantTime = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await grantFarewellTime(gameId);
      if (!result.ok) {
        console.error("Failed to grant farewell time:", result.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  const handleMarkDead = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await markDeadAndAdvance(gameId);
      if (!result.ok) {
        console.error("Failed to mark dead:", result.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  if (speakingOrder.length === 0) {
    return (
      <div className="text-sm text-gray-400">No farewell speeches needed</div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase header */}

      {/* Progress indicator */}
      <div className="flex gap-1.5">
        {speakingOrder.map((seat) => {
          const isCompleted = completedSpeakers.includes(seat);
          const isCurrent = seat === currentSpeaker;

          return (
            <div
              key={seat}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isCurrent
                  ? speakerIsActive
                    ? "bg-red-500 text-white ring-2 ring-red-300 animate-pulse"
                    : "bg-yellow-500 text-white ring-2 ring-yellow-300"
                  : isCompleted
                  ? "bg-gray-600 text-gray-400 line-through"
                  : "bg-gray-700 text-gray-300"
              }`}
              title={
                isCurrent
                  ? speakerIsActive
                    ? "Currently speaking"
                    : "Waiting for time"
                  : isCompleted
                  ? "Farewell completed (dead)"
                  : "Waiting"
              }
            >
              {seat}
            </div>
          );
        })}
      </div>

      {/* Status display */}
      <div className="flex items-center gap-2 text-sm">
        {speakerIsActive && (
          <>
            <span className="text-gray-400">Player</span>
            <span className="px-2 py-0.5 bg-red-500 text-white font-bold rounded-full">
              #{currentSpeaker}
            </span>
            <span className="text-gray-400">is saying goodbye...</span>
          </>
        )}
        {waitingForGrant && (
          <>
            <span className="text-gray-400">Next:</span>
            <span className="px-2 py-0.5 bg-yellow-500 text-white font-bold rounded-full">
              #{nextSpeakerToGrant}
            </span>
            <span className="text-gray-400">awaiting farewell time</span>
          </>
        )}
      </div>

      {/* Control buttons */}
      {waitingForGrant ? (
        // Waiting for grant - show Grant Time button
        <button
          type="button"
          className="rounded-md bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
          disabled={isLoading}
          onClick={handleGrantTime}
        >
          {isLoading
            ? "..."
            : `⏱️ Grant 1 Minute (Player #${nextSpeakerToGrant})`}
        </button>
      ) : speakerIsActive ? (
        // Speaker is active - show Mark Dead button
        <button
          type="button"
          className="rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
          disabled={isLoading}
          onClick={handleMarkDead}
        >
          {isLoading
            ? "..."
            : isLastSpeaker
            ? "💀 Mark as Dead & Start Day →"
            : "💀 Mark as Dead & Next"}
        </button>
      ) : null}
    </div>
  );
}
