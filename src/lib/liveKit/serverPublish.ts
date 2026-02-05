"use server";

/**
 * LiveKit Server-Side Data Publishing Utility
 *
 * Publishes game state updates to all participants in a LiveKit room
 * using reliable data channels for guaranteed delivery.
 *
 * This replaces Supabase Realtime subscriptions for real-time game state sync.
 *
 * @see https://docs.livekit.io/transport/data/state/
 */

import { RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";
import {
  type LiveKitGameMessage,
  type VotingSession,
  type VoteData,
  createVotingSessionUpdateMessage,
  createVoteCastMessage,
  EMPTY_VOTE_DATA,
} from "./messageTypes";
import { adminClient } from "@/lib/supabase/admin";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get LiveKit room name for a game
 * Convention: game-{gameId}
 */
export async function getLiveKitRoomName(gameId: string): Promise<string> {
  return gameId; // Room names are just the gameId in this app
}

/**
 * Create a RoomServiceClient instance
 */
function createRoomServiceClient(): RoomServiceClient {
  return new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );
}

// ============================================================================
// Generic Publisher
// ============================================================================

/**
 * Publish a message to all participants in a LiveKit room.
 * Uses RELIABLE delivery for guaranteed message delivery.
 *
 * @param roomName - The LiveKit room name
 * @param message - The message to publish
 * @returns true if successful, false otherwise
 *
 * Note: This function catches errors and logs them but doesn't throw.
 * The database is the source of truth, so publish failures shouldn't break operations.
 */
export async function publishToRoom(
  roomName: string,
  message: LiveKitGameMessage
): Promise<boolean> {
  try {
    const roomService = createRoomServiceClient();
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    await roomService.sendData(roomName, data, DataPacket_Kind.RELIABLE);

    console.log(
      `[LiveKit] Published ${message.type} to room ${roomName}`
    );
    return true;
  } catch (error) {
    // Log error but don't throw - DB is source of truth
    console.error(
      `[LiveKit] Failed to publish ${message.type} to room ${roomName}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

// ============================================================================
// Vote Data Aggregation Helper
// ============================================================================

/**
 * Aggregate votes from the votes table into VoteData format.
 * Used to build complete state for VOTING_SESSION_UPDATE messages.
 */
export async function aggregateVotesFromDB(
  votingSessionId: string
): Promise<VoteData> {
  const { data: votes, error } = await adminClient
    .from("votes")
    .select("*")
    .eq("voting_session_id", votingSessionId);

  if (error || !votes) {
    console.error("[LiveKit] Failed to fetch votes for aggregation:", error);
    return EMPTY_VOTE_DATA;
  }

  const voteData: VoteData = {
    votes: {},
    playersWhoVoted: [],
    bothLeaveVoters: [],
  };

  for (const vote of votes) {
    if (vote.is_both_leave) {
      voteData.bothLeaveVoters.push(vote.voter_seat);
    } else {
      voteData.playersWhoVoted.push(vote.voter_seat);
      if (vote.seat_number !== null) {
        const key = String(vote.seat_number);
        if (!voteData.votes[key]) voteData.votes[key] = [];
        voteData.votes[key].push(vote.voter_seat);
      }
    }
  }

  return voteData;
}

// ============================================================================
// Voting-Specific Publishers
// ============================================================================

/**
 * Publish complete voting session state to all participants.
 * Called after voting session state changes (create, start vote, advance candidate, etc.)
 *
 * @param gameId - The game ID
 * @param votingSession - The current voting session (null if session ended)
 * @param voteData - Optional pre-aggregated vote data (will fetch from DB if not provided)
 */
export async function publishVotingSessionState(
  gameId: string,
  votingSession: VotingSession | null,
  voteData?: VoteData
): Promise<boolean> {
  const roomName = await getLiveKitRoomName(gameId);

  // If no session, send null state with empty votes
  if (!votingSession) {
    const message = createVotingSessionUpdateMessage(null, EMPTY_VOTE_DATA);
    return publishToRoom(roomName, message);
  }

  // Aggregate votes from DB if not provided
  const finalVoteData = voteData ?? (await aggregateVotesFromDB(votingSession.id));

  const message = createVotingSessionUpdateMessage(votingSession, finalVoteData);
  return publishToRoom(roomName, message);
}

/**
 * Publish a vote cast event to all participants.
 * Called after a player successfully casts a vote.
 *
 * @param gameId - The game ID
 * @param voterSeat - Seat number of the voter
 * @param candidateSeat - Seat number of candidate voted for (null for both-leave)
 * @param isBothLeave - Whether this is a "both leave" vote
 */
export async function publishVoteCast(
  gameId: string,
  voterSeat: number,
  candidateSeat: number | null,
  isBothLeave: boolean
): Promise<boolean> {
  const roomName = await getLiveKitRoomName(gameId);
  const message = createVoteCastMessage(voterSeat, candidateSeat, isBothLeave);
  return publishToRoom(roomName, message);
}

/**
 * Convenience function to fetch voting session and publish its state.
 * Useful when you only have the gameId and need to publish current state.
 *
 * @param gameId - The game ID
 */
export async function fetchAndPublishVotingSessionState(
  gameId: string
): Promise<boolean> {
  const { data: votingSession, error } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    console.error("[LiveKit] Failed to fetch voting session:", error);
    return false;
  }

  return publishVotingSessionState(gameId, votingSession);
}

