"use client";

import { useState } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { BothLeaveVoteControls } from "./BothLeaveVoteControls";
import { RegularVotingControls } from "./RegularVotingControls";

type Props = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Host controls for voting phase.
 * Routes between regular voting and "both leave" vote modes.
 *
 * Flow:
 * 1. Host clicks "Vote Now" for candidate #1
 * 2. Timer counts down, voting ends automatically (server-side)
 * 3. Auto-advance to next candidate, show "Vote Now" again
 * 4. Repeat until all candidates voted
 * 5. Show "Tally Results" button
 */
export default function VotingPhaseControls({ gameSessionState }: Props) {
  const { votingSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!votingSession) {
    return <LoadingSpinner text="Loading..." />;
  }

  const isBothLeaveMode = votingSession.bothLeaveVoteActive;

  if (isBothLeaveMode) {
    return (
      <BothLeaveVoteControls
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        resultMessage={resultMessage}
        setResultMessage={setResultMessage}
      />
    );
  }

  return (
    <RegularVotingControls
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      resultMessage={resultMessage}
      setResultMessage={setResultMessage}
    />
  );
}
