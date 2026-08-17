"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * Hook to determine if a player voted for the current candidate.
 * Used to show thumbs-up indicator on ParticipantComponent.
 */
export function useVoteIndicator(seatNumber: number | null) {
  const { gameSessionState, votingSession, voteData } = useGameRoom();

  return useMemo(() => {
    if (gameSessionState?.gamePhase !== GamePhase.VOTING) {
      return { showVoteIndicator: false };
    }

    if (!votingSession || seatNumber === null) {
      return { showVoteIndicator: false };
    }

    if (votingSession.bothLeaveVoteActive) {
      const hasVotedBothLeave = voteData.bothLeaveVoters.includes(seatNumber);
      return { showVoteIndicator: hasVotedBothLeave };
    }

    const candidates = votingSession.candidates ?? [];
    const currentIdx = votingSession.currentCandidateIndex ?? 0;
    const currentCandidate = candidates[currentIdx];

    const votersForCurrent = voteData.votes[String(currentCandidate)] ?? [];
    const hasVotedForCurrent = votersForCurrent.includes(seatNumber);

    return {
      showVoteIndicator: hasVotedForCurrent,
    };
  }, [gameSessionState?.gamePhase, votingSession, voteData, seatNumber]);
}
