"use client";

import React, { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndDonChooseRightHandButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Host button that ends the `don_chooses_right_hand` phase.
 *
 * Stays disabled until the Don has actually promoted someone (i.e. until any
 * role in `playerRolesMap` is `MAFIA_RIGHT_HAND`). The host always sees all
 * roles, so we can read `playerRolesMap` directly without role-visibility
 * concerns.
 */
const EndDonChooseRightHandButton = ({
  gameSessionState,
}: EndDonChooseRightHandButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { playerRolesMap } = useGameRoom();

  const hasRightHand = useMemo(() => {
    for (const role of playerRolesMap.values()) {
      if (role === "MAFIA_RIGHT_HAND") return true;
    }
    return false;
  }, [playerRolesMap]);

  const handleEndDonChoice = async () => {
    if (isLoading || !hasRightHand) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[4], // "yakuda_shogun_meet"
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleEndDonChoice}
      isLoading={isLoading}
      disabled={!hasRightHand}
      label={hasRightHand ? "Confirm" : "Waiting for Don's pick..."}
      title={
        hasRightHand
          ? undefined
          : "Don has not promoted Right Hand yet"
      }
      variant="success"
    />
  );
};

export default EndDonChooseRightHandButton;
