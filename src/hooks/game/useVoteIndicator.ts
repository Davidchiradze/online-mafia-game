"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Hook to determine if a player voted for the current candidate.
 * Used to show thumbs-up indicator on ParticipantComponent.
 */
export function useVoteIndicator(seatNumber: number | null) {
  const { gameSessionState, votingSession, voteData } = useGameRoom();

  return useMemo(() => {
    // Only show during voting phase
    if (gameSessionState?.game_phase !== "voting") {
      return { showVoteIndicator: false };
    }

    if (!votingSession || seatNumber === null) {
      return { showVoteIndicator: false };
    }

    // "Both leave" vote mode - check both_leave_voters from voteData
    if (votingSession.both_leave_vote_active) {
      const hasVotedBothLeave = voteData.bothLeaveVoters.includes(seatNumber);
      return { showVoteIndicator: hasVotedBothLeave };
    }

    // Regular voting - check votes for current candidate from voteData
    const candidates = votingSession.candidates ?? [];
    const currentIdx = votingSession.current_candidate_index ?? 0;
    const currentCandidate = candidates[currentIdx];

    const votersForCurrent = voteData.votes[String(currentCandidate)] ?? [];
    const hasVotedForCurrent = votersForCurrent.includes(seatNumber);

    return {
      showVoteIndicator: hasVotedForCurrent,
    };
  }, [gameSessionState?.game_phase, votingSession, voteData, seatNumber]);
}
