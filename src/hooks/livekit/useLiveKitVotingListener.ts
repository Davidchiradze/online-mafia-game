"use client";

/**
 * LiveKit Voting Session Listener Hook
 *
 * Replaces useVotingSessionListener with LiveKit data channels for guaranteed delivery.
 * Maintains the same interface for easy integration.
 *
 * @see https://docs.livekit.io/transport/data/state/
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Room as LiveKitRoom, RoomEvent, ConnectionState } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { useLiveKitDataListener } from "./useLiveKitDataListener";
import {
  type VotingSession,
  type VoteData,
  type LiveKitGameMessage,
  isVotingSessionUpdateMessage,
  isVoteCastMessage,
  EMPTY_VOTE_DATA,
} from "@/lib/liveKit/messageTypes";

// Re-export types for consumers (maintain same exports as old hook)
export type { VotingSession, VoteData };

/** Vote record from the vote table (for initial fetch) */
type VoteRecord = {
  id: string;
  voting_session_id: string;
  voter_seat: number;
  seat_number: number | null;
  is_both_leave: boolean;
  is_auto_vote: boolean;
  created_at: string;
};

/**
 * Hook to listen for voting session updates via LiveKit data channels.
 * Provides guaranteed delivery compared to Supabase Realtime.
 *
 * Same interface as useVotingSessionListener for easy migration.
 *
 * @param gameId - The game ID
 * @param room - The LiveKit room instance
 * @param enabled - Whether the listener is enabled (default: true)
 */
export function useLiveKitVotingListener(
  gameId: string,
  room: LiveKitRoom | null | undefined,
  enabled: boolean = true
) {
  const [votingSession, setVotingSession] = useState<VotingSession | null>(null);
  const [voteData, setVoteData] = useState<VoteData>(EMPTY_VOTE_DATA);

  // Track if we've done initial fetch to avoid race conditions
  const hasFetchedRef = useRef(false);

  // Helper to aggregate votes from vote records
  const aggregateVotes = useCallback((voteRecords: VoteRecord[]): VoteData => {
    const votes: Record<string, number[]> = {};
    const playersWhoVoted: number[] = [];
    const bothLeaveVoters: number[] = [];

    for (const vote of voteRecords) {
      if (vote.is_both_leave) {
        bothLeaveVoters.push(vote.voter_seat);
      } else {
        playersWhoVoted.push(vote.voter_seat);
        if (vote.seat_number !== null) {
          const key = String(vote.seat_number);
          if (!votes[key]) votes[key] = [];
          votes[key].push(vote.voter_seat);
        }
      }
    }

    return { votes, playersWhoVoted, bothLeaveVoters };
  }, []);

  // Fetch initial state from DB (for late joiners or reconnection)
  const fetchInitialState = useCallback(async () => {
    if (!gameId) return;

    const supabase = createClient();

    // Fetch voting session
    const { data: session } = await supabase
      .from("voting_sessions")
      .select("*")
      .eq("game_id", gameId)
      .maybeSingle();

    if (session) {
      setVotingSession(session);

      // Also fetch votes for this session
      const { data: votes } = await supabase
        .from("votes")
        .select("*")
        .eq("voting_session_id", session.id);

      if (votes) {
        setVoteData(aggregateVotes(votes as VoteRecord[]));
      }
    } else {
      setVotingSession(null);
      setVoteData(EMPTY_VOTE_DATA);
    }

    hasFetchedRef.current = true;
  }, [gameId, aggregateVotes]);

  // Handle incoming LiveKit messages
  const handleMessage = useCallback(
    (message: LiveKitGameMessage) => {
      if (isVotingSessionUpdateMessage(message)) {
        // Full state update - replace everything
        const { votingSession: newSession, voteData: newVoteData } = message.payload;
        setVotingSession(newSession);
        setVoteData(newVoteData);
      } else if (isVoteCastMessage(message)) {
        // Incremental vote update - add to existing state
        const { voterSeat, candidateSeat, isBothLeave } = message.payload;

        setVoteData((prev) => {
          if (isBothLeave) {
            // Prevent duplicates
            if (prev.bothLeaveVoters.includes(voterSeat)) return prev;
            return {
              ...prev,
              bothLeaveVoters: [...prev.bothLeaveVoters, voterSeat],
            };
          } else {
            // Prevent duplicates
            if (prev.playersWhoVoted.includes(voterSeat)) return prev;

            const newPlayersWhoVoted = [...prev.playersWhoVoted, voterSeat];
            const newVotes = { ...prev.votes };

            if (candidateSeat !== null) {
              const key = String(candidateSeat);
              newVotes[key] = [...(newVotes[key] ?? []), voterSeat];
            }

            return {
              ...prev,
              votes: newVotes,
              playersWhoVoted: newPlayersWhoVoted,
            };
          }
        });
      }
    },
    []
  );

  // Use the generic data listener
  useLiveKitDataListener(room, {
    onMessage: handleMessage,
    enabled,
    messageTypes: ["VOTING_SESSION_UPDATE", "VOTE_CAST"],
  });

  // Initial fetch when enabled
  useEffect(() => {
    if (!enabled || !gameId) {
      hasFetchedRef.current = false;
      return;
    }

    // Fetch initial state from DB
    void fetchInitialState();
  }, [enabled, gameId, fetchInitialState]);

  // Refetch on reconnection
  useEffect(() => {
    if (!room || !enabled) return;

    const handleReconnected = () => {
      console.log("[LiveKit Voting] Reconnected - refetching state");
      void fetchInitialState();
    };

    const handleConnectionStateChanged = (state: ConnectionState) => {
      if (state === ConnectionState.Connected && hasFetchedRef.current) {
        // Only refetch if we've already done initial fetch (meaning we reconnected)
        console.log("[LiveKit Voting] Connection restored - refetching state");
        void fetchInitialState();
      }
    };

    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

    return () => {
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    };
  }, [room, enabled, fetchInitialState]);

  // Reset state when disabled
  useEffect(() => {
    if (!enabled) {
      setVotingSession(null);
      setVoteData(EMPTY_VOTE_DATA);
      hasFetchedRef.current = false;
    }
  }, [enabled]);

  return { votingSession, setVotingSession, voteData };
}

