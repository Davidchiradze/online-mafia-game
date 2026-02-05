"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { castVote, castBothLeaveVote } from "@/lib/voting/actions";
import { VOTING } from "@/lib/constants/game";
import type { VotingSession, VoteData } from "@/lib/liveKit/messageTypes";

type UseVotingButtonOptions = {
  votingSession: VotingSession | null;
  playerSeatNumber: number | null;
  gameId: string;
  voteData: VoteData;
};

/**
 * Hook to manage voting button state.
 * Returns whether button is enabled, time remaining, and submit handler.
 */
export function useVotingButton({
  votingSession,
  playerSeatNumber,
  gameId,
  voteData,
}: UseVotingButtonOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(VOTING.VOTE_WINDOW_SECONDS);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if this is "both leave" vote mode
  const isBothLeaveMode = votingSession?.both_leave_vote_active ?? false;

  // Check if player has already voted - using voteData from vote table
  const hasVoted = (() => {
    if (!votingSession || playerSeatNumber === null) return false;
    if (isBothLeaveMode) {
      return voteData.bothLeaveVoters.includes(playerSeatNumber);
    }
    return voteData.playersWhoVoted.includes(playerSeatNumber);
  })();

  // Check if voting is active
  const isVotingActive = votingSession?.voting_active ?? false;

  // Timer countdown
  useEffect(() => {
    if (!votingSession?.voting_started_at || !isVotingActive) {
      setTimeLeft(VOTING.VOTE_WINDOW_SECONDS);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startTime = new Date(votingSession.voting_started_at).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeLeft(Math.max(0, VOTING.VOTE_WINDOW_SECONDS - elapsed));
    };

    tick();
    intervalRef.current = setInterval(tick, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [votingSession?.voting_started_at, isVotingActive]);

  // Button enabled when voting is active and player hasn't voted
  const isEnabled =
    isVotingActive && !hasVoted && !isSubmitting && playerSeatNumber !== null;

  const submitVote = useCallback(async () => {
    if (!isEnabled) return;
    setIsSubmitting(true);
    try {
      if (isBothLeaveMode) {
        await castBothLeaveVote(gameId);
      } else {
        await castVote(gameId);
      }
    } catch (e) {
      console.error("Vote failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isEnabled, isBothLeaveMode]);

  return {
    isEnabled,
    hasVoted,
    isSubmitting,
    timeLeft,
    isVotingActive,
    isBothLeaveMode,
    submitVote,
  };
}
