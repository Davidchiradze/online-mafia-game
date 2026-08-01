"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import PhaseButton from "@/shared/ui/PhaseButton";
import { useNightPhaseReadiness } from "@/features/game-room/hooks/game/useNightPhaseReadiness";

type EndMafiaTargetButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end mafia target selection
 */
const EndMafiaTargetButton = ({
  gameSessionState,
}: EndMafiaTargetButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { canEndMafiaPhase } = useNightPhaseReadiness();

  const handleEndMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("mafia_chooses_target"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndMafiaTarget}
      isLoading={isLoading}
      disabled={!canEndMafiaPhase}
      label={canEndMafiaPhase ? t("endMafiaPhase") : t("waitingForMafia")}
      variant="danger"
    />
  );
};

export default EndMafiaTargetButton;
