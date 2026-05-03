"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { voting } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { VOTING } from "@/lib/constants/game";
import type { useGameRoom } from "@/lib/context/gameRoomContext";
import { useServerTime } from "@/lib/time/serverTime";

type UseVotingButtonOptions = {
  votingSession: ReturnType<typeof useGameRoom>["votingSession"];
  playerSeatNumber: number | null;
  gameId: string;
  voteData: ReturnType<typeof useGameRoom>["voteData"];
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
  const getServerTime = useServerTime();

  const castVoteMutation = useMutation(voting.castVote);
  const castBothLeaveMutation = useMutation(voting.castBothLeaveVote);

  // Check if this is "both leave" vote mode
  const isBothLeaveMode = votingSession?.bothLeaveVoteActive ?? false;

  // Check if player has already voted - using voteData from vote table
  const hasVoted = (() => {
    if (!votingSession || playerSeatNumber === null) return false;
    if (isBothLeaveMode) {
      return voteData.bothLeaveVoters.includes(playerSeatNumber);
    }
    return voteData.playersWhoVoted.includes(playerSeatNumber);
  })();

  // Check if voting is active
  const isVotingActive = votingSession?.votingActive ?? false;

  // Timer countdown
  useEffect(() => {
    if (!votingSession?.votingStartedAt || !isVotingActive) {
      setTimeLeft(VOTING.VOTE_WINDOW_SECONDS);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startTime = new Date(votingSession.votingStartedAt!).getTime();

    const tick = () => {
      const elapsed = Math.floor((getServerTime() - startTime) / 1000);
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
  }, [votingSession?.votingStartedAt, isVotingActive, getServerTime]);

  // Button enabled when voting is active and player hasn't voted
  const isEnabled =
    isVotingActive && !hasVoted && !isSubmitting && playerSeatNumber !== null;

  const submitVote = useCallback(async () => {
    if (!isEnabled) return;
    setIsSubmitting(true);
    try {
      if (isBothLeaveMode) {
        await castBothLeaveMutation({ gameId: gameId as Id<"games"> });
      } else {
        await castVoteMutation({ gameId: gameId as Id<"games"> });
      }
    } catch (e) {
      console.error("Vote failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, isEnabled, isBothLeaveMode, castVoteMutation, castBothLeaveMutation]);

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
