"use client";

import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { SPEAKING_STATE } from "@/shared/lib/constants/game";
import PhaseButton from "@/shared/ui/PhaseButton";

const BUTTON_RENDER_DELAY_MS = 1000;

type Props = {
  gameId: string;
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
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
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const startSpeaking = useMutation(dayPhase.startDaySpeaking);
  const advanceSpeaker = useMutation(dayPhase.advanceSpeaker);
  const finishSpeaker = useMutation(dayPhase.finishCurrentSpeaker);

  const speakingOrder = gameSessionState.speakingOrder ?? [];
  const currentSpeaker = gameSessionState.currentSpeakerIndex ?? null;

  const isNotStarted = speakingOrder.length === 0 || currentSpeaker === null;
  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);
  const isCompleted = SPEAKING_STATE.isCompleted(currentSpeaker);
  const buttonMode =
    isNotStarted || isCompleted ? "start" : isPaused ? "next" : "finish";
  const disableResetKey = `${buttonMode}-${String(currentSpeaker)}-${speakingOrder.length}`;

  const handleStart = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startSpeaking({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, startSpeaking]);

  const handleFinish = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await finishSpeaker({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, finishSpeaker]);

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await advanceSpeaker({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, advanceSpeaker]);

  if (isNotStarted || isCompleted) {
    return (
      <PhaseButton
        onClick={handleStart}
        isLoading={isLoading}
        // disableOnMountMs={BUTTON_RENDER_DELAY_MS}
        // disableResetKey={disableResetKey}
        label={t("start")}
        variant="success"
      />
    );
  }

  if (isPaused) {
    return (
      <PhaseButton
        onClick={handleNext}
        isLoading={isLoading}
        // disableOnMountMs={BUTTON_RENDER_DELAY_MS}
        // disableResetKey={disableResetKey}
        label={t("start")}
        variant="success"
      />
    );
  }

  return (
    <PhaseButton
      onClick={handleFinish}
      isLoading={isLoading}
      disableOnMountMs={BUTTON_RENDER_DELAY_MS}
      disableResetKey={disableResetKey}
      label={t("finish")}
      variant="danger"
    />
  );
}
