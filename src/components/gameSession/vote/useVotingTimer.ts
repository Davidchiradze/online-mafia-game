"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { VOTING } from "@/lib/constants/game";

type UseVotingTimerReturn = {
  timeLeft: number;
  isLocalVoting: boolean;
  startLocalVoting: () => void;
  stopLocalVoting: () => void;
};

/**
 * Hook to manage voting timer display.
 * Uses local start time for host (immediate feedback), server timestamp for others.
 * Timer is display-only - server controls actual voting end.
 */
export function useVotingTimer(): UseVotingTimerReturn {
  const { votingSession } = useGameRoom();
  const [timeLeft, setTimeLeft] = useState<number>(VOTING.VOTE_WINDOW_SECONDS);
  const [localVotingStart, setLocalVotingStart] = useState<number | null>(null);
  const [isLocalVoting, setIsLocalVoting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startLocalVoting = useCallback(() => {
    setLocalVotingStart(Date.now());
    setIsLocalVoting(true);
  }, []);

  const stopLocalVoting = useCallback(() => {
    setLocalVotingStart(null);
    setIsLocalVoting(false);
  }, []);

  useEffect(() => {
    // Determine start time: use local click time for host, or server timestamp
    const serverStartTime = votingSession?.voting_started_at
      ? new Date(votingSession.voting_started_at).getTime()
      : null;

    const startTime =
      isLocalVoting && localVotingStart
        ? localVotingStart // Host: use local click time for instant feedback
        : serverStartTime; // Others: use server timestamp

    const isVotingActive = isLocalVoting || votingSession?.voting_active;

    if (isVotingActive && startTime) {
      const tick = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, VOTING.VOTE_WINDOW_SECONDS - elapsed);
        setTimeLeft(remaining);
      };

      tick();
      timerRef.current = setInterval(tick, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setTimeLeft(VOTING.VOTE_WINDOW_SECONDS);
    }
  }, [
    isLocalVoting,
    localVotingStart,
    votingSession?.voting_active,
    votingSession?.voting_started_at,
  ]);

  return { timeLeft, isLocalVoting, startLocalVoting, stopLocalVoting };
}

