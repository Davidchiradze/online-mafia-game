"use client";

import React, { useState, useCallback } from "react";
import { GameSessionState } from "@/types/game/type";
import {
  startDayPhaseSpeaking,
  advanceToNextSpeaker,
  finishCurrentSpeaker,
} from "@/lib/dayPhase/actions";
import { SPEAKING_STATE } from "@/lib/constants/game";

type Props = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/**
 * Host controls for speaking phase.
 * - "Start Speaking Round" when not started or completed
 * - "Finish Talking" when a speaker is active (mutes them, enters paused state)
 * - "Next Speaker →" when paused (unmutes next speaker)
 */
export default function DayPhaseSpeakingControls({
  gameId,
  gameSessionState,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speaking_order ?? [];
  const currentSpeaker = gameSessionState.current_speaker_index ?? null;

  const isNotStarted = speakingOrder.length === 0 || currentSpeaker === null;
  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);
  const isCompleted = SPEAKING_STATE.isCompleted(currentSpeaker);

  const handleStart = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startDayPhaseSpeaking(gameId);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading]);

  const handleFinish = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await finishCurrentSpeaker(gameId);
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

  // Not started yet or completed
  if (isNotStarted || isCompleted) {
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

  // Paused state - only show Next Speaker button
  if (isPaused) {
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

  // Active speaker - show only Finish Talking button
  return (
    <button
      type="button"
      className="rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleFinish}
    >
      {isLoading ? "..." : "Finish Talking"}
    </button>
  );
}
