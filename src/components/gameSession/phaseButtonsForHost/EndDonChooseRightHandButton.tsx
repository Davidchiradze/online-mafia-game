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
 * Enabled when either:
 *   - the Don has already promoted someone (any role is `MAFIA_RIGHT_HAND`), or
 *   - no `DON` role exists in this game (so there is nobody to make a pick).
 *
 * The host always sees all roles, so we can read `playerRolesMap` directly
 * without role-visibility concerns.
 */
const EndDonChooseRightHandButton = ({
  gameSessionState,
}: EndDonChooseRightHandButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const { playerRolesMap } = useGameRoom();

  const canConfirm = useMemo(() => {
    let donExists = false;
    for (const role of playerRolesMap.values()) {
      if (role === "MAFIA_RIGHT_HAND") return true;
      if (role === "DON") donExists = true;
    }
    return !donExists;
  }, [playerRolesMap]);

  const handleEndDonChoice = async () => {
    if (isLoading || !canConfirm) return;
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
      disabled={!canConfirm}
      label={canConfirm ? "Confirm" : "Waiting for Don's pick..."}
      title={canConfirm ? undefined : "Don has not promoted Right Hand yet"}
      variant="success"
    />
  );
};

export default EndDonChooseRightHandButton;
