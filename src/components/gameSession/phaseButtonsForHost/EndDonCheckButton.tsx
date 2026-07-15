"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { advanceUpdates } from "@/game/japanese/phaseFlow";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDonCheckButtonProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Button to end don's detective check
 */
const EndDonCheckButton = ({ gameSessionState }: EndDonCheckButtonProps) => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndDonCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: advanceUpdates("don_checks_for_detective"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndDonCheck}
      isLoading={isLoading}
      label={t("endDonCheck")}
      variant="primary"
    />
  );
};

export default EndDonCheckButton;
