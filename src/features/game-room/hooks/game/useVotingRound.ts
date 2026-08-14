"use client";

import { VOTING } from "@/shared/lib/constants/game";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import {
  votingRound,
  votingTally,
  type VotingRound,
} from "@/features/game-room/lib/votingRound";
import type {
  HostPanelDescriptor,
  HostPanelMeta,
} from "@/features/game-room/lib/hostPanel";
import { useHostPanelTimer } from "./useHostPanelTimer";

/** A 3s window: a 10s warning would never fire, and 2s would be permanent. */
const URGENT_SECONDS = 1;

export type VotingRoundState = {
  round: VotingRound;
  /** One pill per candidate, seat → votes. */
  tally: readonly HostPanelMeta[];
  timer: HostPanelDescriptor["timer"];
  /** Votes standing for the candidate on the clock. */
  currentVotes: number;
  /** Yes-votes in a both-leave round. */
  bothLeaveVotes: number;
  /** Alive, non-host seats — the denominator the backend uses too. */
  eligibleVoterCount: number;
};

/**
 * Everything both voting panels read, assembled from the reactive session once.
 *
 * The eligibility count mirrors the backend's `getAliveNonHostSeats` (alive,
 * seated, not the host). It is not cosmetic: it decides when the queue is cut
 * short, so a different filter here would have the host stepping through
 * candidates the server already considers settled.
 */
export function useVotingRound(): VotingRoundState {
  const { votingSession, voteData, players, hostUserId } = useGameRoom();

  const eligibleVoterCount = players.filter(
    (player) =>
      player.isAlive &&
      player.playerId !== hostUserId &&
      player.seatNumber !== undefined,
  ).length;

  const round = votingRound({
    candidates: votingSession?.candidates ?? [],
    currentCandidateIndex: votingSession?.currentCandidateIndex ?? 0,
    votingActive: votingSession?.votingActive ?? false,
    hasWindowRun: votingSession?.votingStartedAt != null,
    bothLeaveVoteActive: votingSession?.bothLeaveVoteActive ?? false,
    isTieBreak: votingSession?.isTieBreak ?? false,
    tieBreakRound: votingSession?.tieBreakRound ?? 0,
    eligibleVoterCount,
    votedCount: new Set(voteData.playersWhoVoted).size,
  });

  const timer = useHostPanelTimer(
    round.step === "counting" ? votingSession?.votingStartedAt : null,
    VOTING.VOTE_WINDOW_MS,
    URGENT_SECONDS,
  );

  return {
    round,
    tally: votingTally(round.candidates, voteData.votes, round.currentCandidate),
    timer,
    currentVotes:
      round.currentCandidate !== null
        ? (voteData.votes[String(round.currentCandidate)] ?? []).length
        : 0,
    bothLeaveVotes: voteData.bothLeaveVoters.length,
    eligibleVoterCount,
  };
}
