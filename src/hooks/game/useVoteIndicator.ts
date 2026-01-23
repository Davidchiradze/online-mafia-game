"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";

type VotesMap = Record<string, number[]>;

/**
 * Hook to determine if a player voted for the current candidate.
 * Used to show thumbs-up indicator on ParticipantComponent.
 */
export function useVoteIndicator(seatNumber: number | null) {
  const { gameSessionState, votingSession } = useGameRoom();

  return useMemo(() => {
    // Only show during voting phase
    if (gameSessionState?.game_phase !== "voting") {
      return { showVoteIndicator: false };
    }

    if (!votingSession || seatNumber === null) {
      return { showVoteIndicator: false };
    }

    const candidates = votingSession.candidates ?? [];
    const currentIdx = votingSession.current_candidate_index ?? 0;
    const currentCandidate = candidates[currentIdx];
    const votes = (votingSession.votes as VotesMap) ?? {};

    // Don't show while voting is active - only after vote ends
    if (votingSession.voting_active) {
      return { showVoteIndicator: false };
    }

    // Check if this player voted for the current candidate
    const votersForCurrent = votes[String(currentCandidate)] ?? [];
    const hasVotedForCurrent = votersForCurrent.includes(seatNumber);

    return {
      showVoteIndicator: hasVotedForCurrent,
    };
  }, [gameSessionState?.game_phase, votingSession, seatNumber]);
}
