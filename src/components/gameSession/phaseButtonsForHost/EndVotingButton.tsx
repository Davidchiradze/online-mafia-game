"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASES } from "@/lib/constants/game";

type EndVotingButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to end voting and process results
 */
const EndVotingButton = ({ gameSessionState }: EndVotingButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const handleEndVoting = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Process voting results and eliminate player
      // TODO: Check win conditions
      await updateSession({
        sessionId: gameSessionState._id,
        updates: {
          gamePhase: GAME_PHASES[19], // "repeat"
          nominatedPlayers: [], // Clear nominations after voting phase ends
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
      disabled={isLoading}
      onClick={handleEndVoting}
    >
      {isLoading ? "Ending..." : "End Voting"}
    </button>
  );
};

export default EndVotingButton;
