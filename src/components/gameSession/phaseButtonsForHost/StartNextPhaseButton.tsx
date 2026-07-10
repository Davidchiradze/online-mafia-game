"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, farewellSpeech } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type StartNextPhaseButtonProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Host control shown during the neutral `phase_transition` buffer. Everyone is
 * asleep; clicking Start wakes the next group, advancing to `nextPhase`.
 *
 * Dispatch:
 * - `nextPhase === "farewell_speech"` is a resolve-marker for the Doctor→wake
 *   exit: run the existing `startFarewellSpeech`, which resolves night kills and
 *   lands on `farewell_speech` (someone died) or `day_phase` (no kill).
 * - Otherwise just advance `gamePhase` to `nextPhase` and clear the pointer.
 */
const StartNextPhaseButton = ({
  gameSessionState,
}: StartNextPhaseButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const startFarewellSpeech = useMutation(farewellSpeech.startFarewellSpeech);

  const nextPhase = gameSessionState.nextPhase;

  const handleStart = async () => {
    if (isLoading || !nextPhase) return;
    setIsLoading(true);
    try {
      if (nextPhase === "farewell_speech") {
        await startFarewellSpeech({ gameId: gameId as Id<"games"> });
      } else {
        await updateSession({
          sessionId: gameSessionState._id,
          updates: { gamePhase: nextPhase, nextPhase: null },
        });
      }
    } catch (error) {
      console.error("Failed to start next phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStart}
      isLoading={isLoading}
      disabled={!nextPhase}
      label={t("start")}
      variant="success"
    />
  );
};

export default StartNextPhaseButton;
