/**
 * LiveKit Data Channel Message Types
 *
 * Defines the message types used for real-time game state synchronization
 * via LiveKit's reliable data channels.
 *
 * Using data packets with RELIABLE delivery ensures guaranteed message delivery
 * compared to Supabase Realtime's fire-and-forget approach.
 *
 * @see https://docs.livekit.io/transport/data/state/
 */

import type { Tables } from "@/db/supabase/database.types";

// ============================================================================
// Base Types (re-exported for convenience)
// ============================================================================

/** Voting session from database */
export type VotingSession = Tables<"voting_sessions">;

/** Aggregated vote data for UI consumption */
export type VoteData = {
  /** Map of candidate seat number (as string) to array of voter seat numbers */
  votes: Record<string, number[]>;
  /** Array of seat numbers who have voted (regular votes) */
  playersWhoVoted: number[];
  /** Array of seat numbers who voted for "both leave" */
  bothLeaveVoters: number[];
};

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message sent when voting session state changes.
 * Contains complete state - clients should replace their local state entirely.
 *
 * Triggered by:
 * - createVotingSession
 * - startVoteWindow / endVoteWindow
 * - advanceToNextCandidate
 * - startTieBreak / startBothLeaveVote
 * - processVotingResults / processBothLeaveResult
 * - endVotingPhase (payload will be null)
 */
export type VotingSessionUpdateMessage = {
  type: "VOTING_SESSION_UPDATE";
  payload: {
    /** The voting session data, or null if session ended */
    votingSession: VotingSession | null;
    /** Aggregated vote data from all votes in the session */
    voteData: VoteData;
  };
};

/**
 * Message sent when a player casts a vote.
 * Clients should incrementally add this vote to their local state.
 *
 * Triggered by:
 * - castVote
 * - castBothLeaveVote
 */
export type VoteCastMessage = {
  type: "VOTE_CAST";
  payload: {
    /** Seat number of the voter */
    voterSeat: number;
    /** Seat number of candidate voted for (null for both-leave votes) */
    candidateSeat: number | null;
    /** Whether this is a "both leave" vote */
    isBothLeave: boolean;
  };
};

// ============================================================================
// Union Type & Type Guards
// ============================================================================

/**
 * Union type for all LiveKit game messages.
 * Add new message types here as features are migrated.
 */
export type LiveKitGameMessage = VotingSessionUpdateMessage | VoteCastMessage;

/**
 * All possible message types (for exhaustive switch checks)
 */
export type LiveKitMessageType = LiveKitGameMessage["type"];

/**
 * Type guard for VotingSessionUpdateMessage
 */
export function isVotingSessionUpdateMessage(
  message: LiveKitGameMessage
): message is VotingSessionUpdateMessage {
  return message.type === "VOTING_SESSION_UPDATE";
}

/**
 * Type guard for VoteCastMessage
 */
export function isVoteCastMessage(
  message: LiveKitGameMessage
): message is VoteCastMessage {
  return message.type === "VOTE_CAST";
}

// ============================================================================
// Message Constructors (for server-side use)
// ============================================================================

/**
 * Create a voting session update message
 */
export function createVotingSessionUpdateMessage(
  votingSession: VotingSession | null,
  voteData: VoteData
): VotingSessionUpdateMessage {
  return {
    type: "VOTING_SESSION_UPDATE",
    payload: {
      votingSession,
      voteData,
    },
  };
}

/**
 * Create a vote cast message
 */
export function createVoteCastMessage(
  voterSeat: number,
  candidateSeat: number | null,
  isBothLeave: boolean
): VoteCastMessage {
  return {
    type: "VOTE_CAST",
    payload: {
      voterSeat,
      candidateSeat,
      isBothLeave,
    },
  };
}

// ============================================================================
// Empty State Constants
// ============================================================================

/**
 * Default empty vote data state
 */
export const EMPTY_VOTE_DATA: VoteData = {
  votes: {},
  playersWhoVoted: [],
  bothLeaveVoters: [],
};

