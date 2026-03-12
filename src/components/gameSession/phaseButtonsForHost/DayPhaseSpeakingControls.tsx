"use client";

import React, { useState, useCallback } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import {
  startDayPhaseSpeaking,
  advanceToNextSpeaker,
  finishCurrentSpeaker,
} from "@/lib/dayPhase/actions";
import { SPEAKING_STATE } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type Props = {
  gameId: string;
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Host controls for speaking phase.
 * - "Start" when not started or completed
 * - "Finish" when a speaker is active (mutes them, enters paused state)
 * - "Next" when paused (unmutes next speaker)
 */
export default function DayPhaseSpeakingControls({
  gameId,
  gameSessionState,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const speakingOrder = gameSessionState.speakingOrder ?? [];
  const currentSpeaker = gameSessionState.currentSpeakerIndex ?? null;

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

  if (isNotStarted || isCompleted) {
    return (
      <PhaseButton onClick={handleStart} isLoading={isLoading} label="Start" />
    );
  }

  if (isPaused) {
    return (
      <PhaseButton onClick={handleNext} isLoading={isLoading} label="Start" />
    );
  }

  return (
    <PhaseButton onClick={handleFinish} isLoading={isLoading} label="Finish" />
  );
}
