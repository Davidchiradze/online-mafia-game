"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, dayPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDoctorMeetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end the doctor meeting phase
 */
const EndDoctorMeetButton = ({
  gameSessionState,
}: EndDoctorMeetButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const resetSpeakingState = useMutation(dayPhase.resetSpeakingState);

  const handleEndDoctorMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("doctor_meet"),
      });

      // Clearing speaking state is phase-agnostic; running it now keeps it clean
      // through the neutral gap into the introduction phase.
      await resetSpeakingState({ gameId: gameId as Id<"games"> });
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndDoctorMeet} isLoading={isLoading} label={t("endMeeting")} variant="danger" />;
};

export default EndDoctorMeetButton;
