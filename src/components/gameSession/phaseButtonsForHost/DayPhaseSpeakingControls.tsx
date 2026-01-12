"use client";

import React, { useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import {
  startDayPhaseSpeaking,
  advanceToNextSpeaker,
} from "@/lib/dayPhase/actions";

type Props = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/**
 * Simple host controls for speaking phase.
 * Shows "Start Speaking" when not started, "Next Speaker" when in progress.
 */
export default function DayPhaseSpeakingControls({
  gameId,
  gameSessionState,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speaking_order ?? [];
  const currentSpeaker = gameSessionState.current_speaker_index ?? null;
  const isInProgress = speakingOrder.length > 0 && currentSpeaker != null;

  const handleStart = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startDayPhaseSpeaking(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await advanceToNextSpeaker(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  if (!isInProgress) {
    return (
      <button
        type="button"
        className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
        disabled={isLoading}
        onClick={handleStart}
      >
        {isLoading ? "Starting..." : "Start Speaking Round"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleNext}
    >
      {isLoading ? "..." : "Next Speaker →"}
    </button>
  );
}
