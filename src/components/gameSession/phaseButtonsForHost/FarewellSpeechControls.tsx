"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { farewellSpeech } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/shared/ui/PhaseButton";

type Props = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Host controls for farewell speech phase.
 *
 * Flow for each dying player:
 * 1. Host clicks "Start" → player can speak (timer starts)
 * 2. Host clicks "Finish" → player marked dead, advance to next or day_phase
 *
 * The order of speakers is randomized so players don't know
 * who was killed by mafia vs yakuza.
 */
export default function FarewellSpeechControls({ gameSessionState }: Props) {
  const t = useTranslations("game.host");
  const { gameId, players } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const grantFarewellTimeMutation = useMutation(
    farewellSpeech.grantFarewellTime,
  );
  const markDeadAndAdvanceMutation = useMutation(
    farewellSpeech.markDeadAndAdvance,
  );
  const advanceFromFarewellMutation = useMutation(
    farewellSpeech.advanceFromFarewell,
  );

  const speakingOrder = useMemo(
    () => gameSessionState.speakingOrder ?? [],
    [gameSessionState.speakingOrder],
  );
  const currentSpeaker = gameSessionState.currentSpeakerIndex ?? null;
  const speakerStartedAt = gameSessionState.speakerStartedAt ?? null;

  // Determine which speakers have completed (are dead) and which remain (alive)
  const { completedSpeakers, remainingSpeakers } = useMemo(() => {
    const completed: number[] = [];
    const remaining: number[] = [];

    for (const seat of speakingOrder) {
      const player = players?.find((p) => p.seatNumber === seat);
      if (player?.isAlive === false) {
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

  // All speeches finished — waiting for host to advance
  const allDone =
    currentSpeaker === null &&
    remainingSpeakers.length === 0 &&
    speakingOrder.length > 0;

  // Get the next speaker who needs time granted
  const nextSpeakerToGrant = remainingSpeakers[0];

  const handleGrantTime = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await grantFarewellTimeMutation({ gameId: gameId as Id<"games"> });
    } catch (e) {
      console.error("Failed to grant farewell time:", e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, grantFarewellTimeMutation]);

  const handleMarkDead = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await markDeadAndAdvanceMutation({ gameId: gameId as Id<"games"> });
    } catch (e) {
      console.error("Failed to mark dead:", e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, markDeadAndAdvanceMutation]);

  const handleAdvance = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await advanceFromFarewellMutation({ gameId: gameId as Id<"games"> });
    } catch (e) {
      console.error("Failed to advance from farewell:", e);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isLoading, advanceFromFarewellMutation]);

  if (speakingOrder.length === 0) {
    return (
      <div className="text-sm text-white/50">{t("noFarewellNeeded")}</div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Progress indicator */}
      <div className="flex gap-1.5">
        {speakingOrder.map((seat) => {
          const isCompleted = completedSpeakers.includes(seat);
          const isCurrent = seat === currentSpeaker;

          return (
            <div
              key={seat}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                isCurrent
                  ? speakerIsActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/50"
                  : isCompleted
                    ? "bg-white/5 text-white/30 border-white/10 line-through"
                    : "bg-white/5 text-white/60 border-white/20"
              }`}
              title={
                isCurrent
                  ? speakerIsActive
                    ? t("currentlySpeaking")
                    : t("waitingForTime")
                  : isCompleted
                    ? t("farewellCompleted")
                    : t("waiting")
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
            <span className="text-white/50">{t("playerLabel")}</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-xs border border-emerald-500/30">
              #{currentSpeaker}
            </span>
            <span className="text-white/50">{t("isSayingGoodbye")}</span>
          </>
        )}
        {waitingForGrant && (
          <>
            <span className="text-white/50">{t("next")}</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold rounded-full text-xs border border-emerald-500/30">
              #{nextSpeakerToGrant}
            </span>
          </>
        )}
        {allDone && (
          <span className="text-white/50">{t("allFarewellCompleted")}</span>
        )}
      </div>

      {/* Control buttons */}
      {waitingForGrant ? (
        <PhaseButton
          onClick={handleGrantTime}
          isLoading={isLoading}
          label={t("start")}
          variant="success"
        />
      ) : speakerIsActive ? (
        <PhaseButton
          onClick={handleMarkDead}
          isLoading={isLoading}
          label={t("finish")}
          variant="danger"
        />
      ) : allDone ? (
        <PhaseButton
          onClick={handleAdvance}
          isLoading={isLoading}
          label={t("advanceToNextPhase")}
          variant="primary"
        />
      ) : null}
    </div>
  );
}
