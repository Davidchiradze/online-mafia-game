"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { VOTING } from "@/lib/constants/game";
import { useServerTime } from "@/lib/time/serverTime";

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
  const getServerTime = useServerTime();

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
    const serverStartTime = votingSession?.votingStartedAt
      ? new Date(votingSession.votingStartedAt).getTime()
      : null;

    const startTime =
      isLocalVoting && localVotingStart
        ? localVotingStart // Host: use local click time for instant feedback
        : serverStartTime; // Others: use server timestamp

    const isVotingActive = isLocalVoting || votingSession?.votingActive;

    if (isVotingActive && startTime) {
      const tick = () => {
        // Host's local-start branch subtracts two local `Date.now()` values
        // so clock skew cancels out. Server-timestamp branch uses
        // `getServerTime()` to apply the SSR-measured offset.
        const nowMs = isLocalVoting && localVotingStart ? Date.now() : getServerTime();
        const elapsed = Math.floor((nowMs - startTime) / 1000);
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
    votingSession?.votingActive,
    votingSession?.votingStartedAt,
    getServerTime,
  ]);

  return { timeLeft, isLocalVoting, startLocalVoting, stopLocalVoting };
}

