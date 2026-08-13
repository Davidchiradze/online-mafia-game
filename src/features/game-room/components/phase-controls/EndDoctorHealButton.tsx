"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { advanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import PhaseButton from "@/features/game-room/components/ui/PhaseButton";
import { useNightPhaseReadiness } from "@/features/game-room/hooks/game/useNightPhaseReadiness";

/**
 * Button to end the doctor's heal action.
 *
 * Rather than resolving the night immediately, it parks the game in the neutral
 * `phase_transition` sleep buffer so the Doctor isn't glimpsed as everyone wakes.
 * `nextPhase: "farewell_speech"` is a resolve-marker: StartNextPhaseButton runs
 * the unchanged `startFarewellSpeech`, which determines kills and lands on
 * `farewell_speech` (a player died) or `day_phase` (no one died).
 */
const EndDoctorHealButton = () => {
  const t = useTranslations("game.host");
  const { gameSessionState } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { canEndDoctorPhase } = useNightPhaseReadiness();

  const handleEndDoctorHeal = async () => {
    if (isLoading || !gameSessionState) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("doctor_heals_player"),
      });
    } catch (e) {
      console.error("Failed to end doctor heal:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndDoctorHeal}
      isLoading={isLoading}
      disabled={!canEndDoctorPhase}
      label={canEndDoctorPhase ? t("finish") : t("waitingForDoctor")}
      variant="success"
    />
  );
};

export default EndDoctorHealButton;
