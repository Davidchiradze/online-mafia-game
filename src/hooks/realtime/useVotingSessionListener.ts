"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/db/supabase/database.types";

export type VotingSession = Tables<"voting_sessions">;

/** Vote record from the vote table */
export type VoteRecord = {
  id: string;
  voting_session_id: string;
  voter_seat: number;
  seat_number: number | null;
  is_both_leave: boolean;
  is_auto_vote: boolean;
  created_at: string;
};

/** Aggregated vote data for UI consumption */
export type VoteData = {
  /** Map of candidate seat number to array of voter seat numbers */
  votes: Record<string, number[]>;
  /** Array of seat numbers who have voted (regular votes) */
  playersWhoVoted: number[];
  /** Array of seat numbers who voted for "both leave" */
  bothLeaveVoters: number[];
};

/**
 * Hook to subscribe to voting session and vote changes.
 * Provides real-time updates during the voting phase.
 *
 * Updates include:
 * - Current candidate being voted on
 * - Voting window active/inactive
 * - Vote counts per candidate (from vote table)
 * - Players who have voted
 * - Tie-break and both-leave vote states
 */
export function useVotingSessionListener(
  gameId: string,
  enabled: boolean = true
) {
  const [votingSession, setVotingSession] = useState<VotingSession | null>(
    null
  );
  const [voteData, setVoteData] = useState<VoteData>({
    votes: {},
    playersWhoVoted: [],
    bothLeaveVoters: [],
  });

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

  // Fetch votes for a session
  const fetchVotes = useCallback(
    async (sessionId: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("votes")
        .select("*")
        .eq("voting_session_id", sessionId);

      if (data) {
        setVoteData(aggregateVotes(data as VoteRecord[]));
      }
    },
    [aggregateVotes]
  );

  useEffect(() => {
    if (!gameId || !enabled) return;

    const supabase = createClient();

    // Initial fetch of voting session
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("game_id", gameId)
        .maybeSingle();

      if (data) {
        setVotingSession(data);
        // Also fetch votes for this session
        await fetchVotes(data.id);
      }
    };

    void fetchInitial();

    // Subscribe to voting_sessions changes
    const sessionChannel = supabase
      .channel(`voting_session_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newSession = payload.new as VotingSession;
          setVotingSession(newSession);
          // Reset vote data for new session
          setVoteData({ votes: {}, playersWhoVoted: [], bothLeaveVoters: [] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setVotingSession(payload.new as VotingSession);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "voting_sessions",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          setVotingSession(null);
          setVoteData({ votes: {}, playersWhoVoted: [], bothLeaveVoters: [] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [gameId, enabled, fetchVotes]);

  // Subscribe to vote table changes (separate effect to track session ID changes)
  useEffect(() => {
    if (!votingSession?.id || !enabled) return;

    const supabase = createClient();
    const sessionId = votingSession.id;

    // Subscribe to votes table INSERT events
    const voteChannel = supabase
      .channel(`votes_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `voting_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newVote = payload.new as VoteRecord;
          setVoteData((prev) => {
            // Add the new vote to appropriate lists
            if (newVote.is_both_leave) {
              return {
                ...prev,
                bothLeaveVoters: [...prev.bothLeaveVoters, newVote.voter_seat],
              };
            } else {
              const newPlayersWhoVoted = [
                ...prev.playersWhoVoted,
                newVote.voter_seat,
              ];
              const newVotes = { ...prev.votes };
              if (newVote.seat_number !== null) {
                const key = String(newVote.seat_number);
                newVotes[key] = [...(newVotes[key] ?? []), newVote.voter_seat];
              }
              return {
                ...prev,
                votes: newVotes,
                playersWhoVoted: newPlayersWhoVoted,
              };
            }
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "votes",
          filter: `voting_session_id=eq.${sessionId}`,
        },
        () => {
          // On delete (tie-break reset), refetch all votes
          void fetchVotes(sessionId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [votingSession?.id, enabled, fetchVotes]);

  return { votingSession, setVotingSession, voteData };
}
