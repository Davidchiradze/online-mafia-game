"use client";

import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { SPEAKING_STATE } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

const BUTTON_RENDER_DELAY_MS = 2000;

type Props = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Host controls for nominated players speaking phase.
 * Shows current speaker and allows advancing to the next nominated player.
 * Each nominated player gets 30 seconds for self-justification.
 * - "Finish" when a speaker is active (mutes them, enters paused state)
 * - "Start" when paused (start next speaker)
 * - If foul elimination occurred, shows "Finish" to continue to night phase
 */
export default function NominatedPlayersSpeakingControls({
  gameSessionState,
}: Props) {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const advanceNominatedSpeaker = useMutation(dayPhase.advanceNominatedSpeaker);
  const finishCurrentNominatedSpeaker = useMutation(
    dayPhase.finishCurrentNominatedSpeaker,
  );

  const speakingOrder = gameSessionState.speakingOrder ?? [];
  const currentSpeaker = gameSessionState.currentSpeakerIndex ?? null;
  const nominatedPlayers = gameSessionState.nominatedPlayers ?? [];

  const foulEliminationOccurred =
    gameSessionState.foulEliminationOccurred ?? false;

  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);

  const lastSpeakerSeat = isPaused
    ? SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker!)
    : null;
  const activeSpeakerSeat = !isPaused ? currentSpeaker : null;

  const lastSpeakerIndex = lastSpeakerSeat
    ? speakingOrder.indexOf(lastSpeakerSeat)
    : -1;
  const nextSpeakerSeat =
    isPaused && lastSpeakerIndex < speakingOrder.length - 1
      ? speakingOrder[lastSpeakerIndex + 1]
      : null;

  const currentPosition = isPaused
    ? lastSpeakerIndex + 1
    : activeSpeakerSeat !== null
      ? speakingOrder.indexOf(activeSpeakerSeat) + 1
      : 0;
  const totalSpeakers = speakingOrder.length;
  const isLastSpeaker = currentPosition === totalSpeakers;
  const buttonMode = foulEliminationOccurred
    ? isPaused
      ? "foul-paused-finish"
      : "foul-active-finish"
    : isPaused
      ? isLastSpeaker
        ? "paused-last-finish"
        : "paused-next-start"
      : "active-finish";
  const disableResetKey = `${buttonMode}-${String(currentSpeaker)}-${totalSpeakers}`;

  const handleFinish = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await finishCurrentNominatedSpeaker({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, finishCurrentNominatedSpeaker]);

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await advanceNominatedSpeaker({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, advanceNominatedSpeaker]);

  if (currentSpeaker === null || speakingOrder.length === 0) {
    return (
      <div className="text-sm text-white/50">{t("noNominatedPlayersSpeaking")}</div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Foul elimination warning */}
      {foulEliminationOccurred && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center w-full">
          <p className="text-amber-300 text-sm font-medium">
            {t("playerEliminatedByFouls")}
          </p>
          <p className="text-amber-400/70 text-xs mt-1">
            {isPaused
              ? t("continueToNightPhase")
              : t("speakerCanFinishThenNight")}
          </p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex gap-1.5">
        {nominatedPlayers.map((seat) => {
          const speakerPosition = speakingOrder.indexOf(seat);
          const hasSpoken = speakerPosition < currentPosition;
          const isActive = seat === activeSpeakerSeat;
          const isNext = seat === nextSpeakerSeat;

          return (
            <div
              key={seat}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30"
                  : isNext
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                    : hasSpoken
                      ? "bg-white/5 text-white/30 border-white/10"
                      : "bg-white/5 text-white/60 border-white/20"
              }`}
              title={
                isActive
                  ? t("currentlySpeaking")
                  : isNext
                    ? t("nextSpeaker")
                    : hasSpoken
                      ? t("finished")
                      : t("waiting")
              }
            >
              {seat}
            </div>
          );
        })}
      </div>

      {/* Control buttons */}
      {foulEliminationOccurred ? (
        isPaused ? (
          <PhaseButton
            onClick={handleNext}
            isLoading={isLoading}
            disableOnMountMs={BUTTON_RENDER_DELAY_MS}
            disableResetKey={disableResetKey}
            label={t("finish")}
            variant="danger"
          />
        ) : (
          <PhaseButton
            onClick={handleFinish}
            isLoading={isLoading}
            disableOnMountMs={BUTTON_RENDER_DELAY_MS}
            disableResetKey={disableResetKey}
            label={t("finish")}
            variant="danger"
          />
        )
      ) : isPaused ? (
        <PhaseButton
          onClick={handleNext}
          isLoading={isLoading}
          disableOnMountMs={BUTTON_RENDER_DELAY_MS}
          disableResetKey={disableResetKey}
          label={isLastSpeaker ? t("finish") : t("start")}
          variant={isLastSpeaker ? "danger" : "success"}
        />
      ) : (
        <PhaseButton
          onClick={handleFinish}
          isLoading={isLoading}
          disableOnMountMs={BUTTON_RENDER_DELAY_MS}
          disableResetKey={disableResetKey}
          label={t("finish")}
          variant="danger"
        />
      )}
    </div>
  );
}
