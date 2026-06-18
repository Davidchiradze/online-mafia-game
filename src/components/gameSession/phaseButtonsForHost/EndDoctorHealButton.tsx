"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { farewellSpeech } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";
import { useNightPhaseReadiness } from "@/hooks/game/useNightPhaseReadiness";

/**
 * Button to end doctor's heal action and transition to farewell speech phase.
 *
 * Flow:
 * - Calls startFarewellSpeech which:
 *   - Determines who was killed (mafia_target, yakuza_target) minus healed player
 *   - If no one dies, skips directly to day_phase
 *   - Otherwise, transitions to farewell_speech with randomized speaker order
 */
const EndDoctorHealButton = () => {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const { canEndDoctorPhase } = useNightPhaseReadiness();

  const startFarewellSpeechMutation = useMutation(farewellSpeech.startFarewellSpeech);

  const handleEndDoctorHeal = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startFarewellSpeechMutation({ gameId: gameId as Id<"games"> });
    } catch (e) {
      console.error("Failed to start farewell speech:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndDoctorHeal}
      isLoading={isLoading}
      disabled={!canEndDoctorPhase}
      label={canEndDoctorPhase ? t("endDoctorPhase") : t("waitingForDoctor")}
      variant="success"
    />
  );
};

export default EndDoctorHealButton;
