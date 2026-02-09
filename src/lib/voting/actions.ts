"use server";

/**
 * Voting Phase Server Actions
 *
 * Core voting flow:
 * 1. initializeVoting - Create voting session with candidates from nominated_players
 * 2. startVoteWindow - Enable voting for 5 seconds
 * 3. castVote - Player casts vote for current candidate (atomic INSERT)
 * 4. endVoteWindow - Close voting window
 * 5. advanceToNextCandidate - Move to next candidate
 *
 * Players CAN vote for themselves.
 * Players who don't vote get auto-assigned to last candidate (handled in Task 3).
 *
 * RACE CONDITION FIX: Votes are now stored in a separate `vote` table with atomic INSERTs
 * instead of read-modify-write on JSONB columns.
 */

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/db/supabase/database.types";
import { VOTING } from "@/lib/constants/game";
import { publishVoteCast, publishVotingSessionState } from "@/lib/liveKit/serverPublish";

type ActionResult = { ok: true } | { ok: false; message: string };

/** Vote record from the vote table */
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
 * Helper to get all votes for a voting session.
 */
async function getVotesForSession(
  votingSessionId: string
): Promise<VoteRecord[]> {
  const { data } = await adminClient
    .from("votes")
    .select("*")
    .eq("voting_session_id", votingSessionId);

  return (data as VoteRecord[]) ?? [];
}

/**
 * Helper to build a votes map from vote records.
 * Returns: { "seatNumber": [voterSeatNumbers] }
 */
function buildVotesMap(votes: VoteRecord[]): Record<string, number[]> {
  const votesMap: Record<string, number[]> = {};
  for (const vote of votes) {
    if (vote.seat_number !== null && !vote.is_both_leave) {
      const key = String(vote.seat_number);
      if (!votesMap[key]) votesMap[key] = [];
      votesMap[key].push(vote.voter_seat);
    }
  }
  return votesMap;
}

/**
 * Helper to get list of players who voted (for regular votes, not both-leave).
 */
function getPlayersWhoVoted(votes: VoteRecord[]): number[] {
  return votes
    .filter((v) => !v.is_both_leave)
    .map((v) => v.voter_seat);
}

/**
 * Helper to get list of players who voted for "both leave".
 */
function getBothLeaveVoters(votes: VoteRecord[]): number[] {
  return votes
    .filter((v) => v.is_both_leave)
    .map((v) => v.voter_seat);
}

/**
 * Internal helper to create voting session without auth check.
 * Used during phase transition where auth is already verified.
 * Returns the created session or null if it already exists or fails.
 */
export async function createVotingSessionInternal(
  gameId: string,
  candidates: number[]
): Promise<Tables<"voting_sessions"> | null> {
  // Check if voting session already exists
  const { data: existing } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  if (candidates.length === 0) {
    return null;
  }

  // Create voting session (votes are in separate table now)
  const { data: newSession, error: insertErr } = await adminClient
    .from("voting_sessions")
    .insert({
      game_id: gameId,
      candidates,
      round_number: 1,
      current_candidate_index: 0,
      voting_active: false,
      votes: {}, // Legacy - kept for compatibility
      players_who_voted: [], // Legacy - kept for compatibility
      is_tie_break: false,
      tie_break_round: 0,
      both_leave_vote_active: false,
    })
    .select()
    .single();

  if (insertErr || !newSession) {
    console.error("Failed to create voting session:", insertErr);
    return null;
  }

  // Publish new voting session state via LiveKit (no votes yet)
  void publishVotingSessionState(gameId, newSession, {
    votes: {},
    playersWhoVoted: [],
    bothLeaveVoters: [],
  });

  return newSession;
}

/**
 * Verify the caller is the host of the game.
 */
async function verifyHost(
  gameId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: game, error: gameErr } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  if (gameErr || !game) {
    return { ok: false, message: "Game not found" };
  }

  if (game.host_id !== userId) {
    return {
      ok: false,
      message: "Forbidden: Only host can perform this action",
    };
  }

  return { ok: true };
}

/**
 * Get the current player's seat number from auth.
 */
async function getPlayerSeat(
  gameId: string,
  userId: string
): Promise<number | null> {
  const { data: player } = await adminClient
    .from("game_players")
    .select("seat_number")
    .eq("game_id", gameId)
    .eq("player_id", userId)
    .single();

  return player?.seat_number ?? null;
}

/**
 * Initialize voting phase.
 * Creates a voting_sessions row with candidates from game_sessions.nominated_players.
 * Called when transitioning from nominated_players_speak to voting phase.
 * Returns the created/existing session for immediate state update.
 */
export async function initializeVoting(
  gameId: string
): Promise<
  | { ok: true; session: Tables<"voting_sessions">; alreadyExists?: boolean }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Check if voting session already exists
  const { data: existing } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    return { ok: true, session: existing, alreadyExists: true };
  }

  // Get nominated players from game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("nominated_players, game_phase")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  if (gameSession.game_phase !== "voting") {
    return { ok: false, message: "Not in voting phase" };
  }

  const candidates = gameSession.nominated_players ?? [];

  if (candidates.length === 0) {
    return { ok: false, message: "No candidates to vote on" };
  }

  // Create voting session and return it
  const { data: newSession, error: insertErr } = await adminClient
    .from("voting_sessions")
    .insert({
      game_id: gameId,
      candidates,
      round_number: 1,
      current_candidate_index: 0,
      voting_active: false,
      votes: {}, // Legacy
      players_who_voted: [], // Legacy
      is_tie_break: false,
      tie_break_round: 0,
      both_leave_vote_active: false,
    })
    .select()
    .single();

  if (insertErr || !newSession) {
    return {
      ok: false,
      message: insertErr?.message ?? "Failed to create session",
    };
  }

  return { ok: true, session: newSession };
}

/**
 * Start the voting window for the current candidate.
 * Sets voting_active=true and voting_started_at to current time.
 * Automatically ends the voting window after VOTE_WINDOW_MS.
 * Host only.
 */
export async function startVoteWindow(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  if (votingSession.voting_active) {
    return { ok: false, message: "Voting is already active" };
  }

  // Start voting window
  const { data: updatedSession, error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: true,
      voting_started_at: new Date().toISOString(),
    })
    .eq("id", votingSession.id)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return { ok: false, message: updateErr?.message ?? "Failed to start vote window" };
  }

  // Publish voting STARTED state via LiveKit (all clients see this immediately)
  await publishVotingSessionState(gameId, updatedSession);

  // Wait for the voting window duration (server-side timer)
  await new Promise(resolve => setTimeout(resolve, VOTING.VOTE_WINDOW_MS));

  // End voting window (keep voting_started_at so UI knows vote ended for this candidate)
  const { data: endedSession, error: endErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: false,
    })
    .eq("id", votingSession.id)
    .select()
    .single();

  if (endErr || !endedSession) {
    return { ok: false, message: endErr?.message ?? "Failed to end vote window" };
  }

  // Publish voting ENDED state via LiveKit
  await publishVotingSessionState(gameId, endedSession);

  return { ok: true };
}

/**
 * End the voting window for the current candidate.
 * Sets voting_active=false.
 * Host only.
 */
export async function endVoteWindow(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("id, voting_active")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  if (!votingSession.voting_active) {
    return { ok: false, message: "Voting is not active" };
  }

  // End voting window (keep voting_started_at so UI knows vote ended for this candidate)
  const { data: updatedSession, error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: false,
    })
    .eq("id", votingSession.id)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return { ok: false, message: updateErr?.message ?? "Failed to end vote window" };
  }

  // Publish updated session state via LiveKit
  void publishVotingSessionState(gameId, updatedSession);

  return { ok: true };
}

/**
 * Cast a vote for the current candidate.
 * Called by players during the voting window.
 * Players CAN vote for themselves.
 * Each player can only vote once per voting round.
 *
 * ATOMIC: Uses INSERT into vote table with unique constraint.
 * No race condition possible - duplicate votes rejected by DB.
 */
export async function castVote(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Get voter's seat number
  const voterSeat = await getPlayerSeat(gameId, user.id);
  if (voterSeat === null) {
    return { ok: false, message: "Player not found in game" };
  }

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  // Check if voting is active
  if (!votingSession.voting_active) {
    return { ok: false, message: "Voting is not currently active" };
  }

  // Check if player is alive
  const { data: player } = await adminClient
    .from("game_players")
    .select("is_alive")
    .eq("game_id", gameId)
    .eq("seat_number", voterSeat)
    .single();

  if (!player || player.is_alive === false) {
    return { ok: false, message: "Dead players cannot vote" };
  }

  // Get current candidate
  const candidates = votingSession.candidates ?? [];
  const currentCandidateIndex = votingSession.current_candidate_index ?? 0;
  const currentCandidate = candidates[currentCandidateIndex];

  if (currentCandidate === undefined) {
    return { ok: false, message: "No candidate to vote for" };
  }

  // Note: Players CAN vote for themselves (removed restriction)

  // ATOMIC INSERT - unique constraint prevents duplicate votes
  const { error: insertErr } = await adminClient.from("votes").insert({
    voting_session_id: votingSession.id,
    voter_seat: voterSeat,
    seat_number: currentCandidate,
    is_both_leave: false,
    is_auto_vote: false,
  });

  if (insertErr) {
    // Check if it's a unique constraint violation (already voted)
    if (insertErr.code === "23505") {
      return { ok: false, message: "You have already voted this round" };
    }
    return { ok: false, message: insertErr.message };
  }

  // Publish vote via LiveKit for real-time sync (fire-and-forget, DB is source of truth)
  void publishVoteCast(gameId, voterSeat, currentCandidate, false);

  return { ok: true };
}

/**
 * Advance to the next candidate in the voting sequence.
 * Host only.
 *
 * Returns allDone=true when all candidates have been voted on.
 */
export async function advanceToNextCandidate(
  gameId: string
): Promise<ActionResult & { allDone?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  if (votingSession.voting_active) {
    return { ok: false, message: "Cannot advance while voting is active" };
  }

  const candidates = votingSession.candidates ?? [];
  const currentIndex = votingSession.current_candidate_index ?? 0;
  const nextIndex = currentIndex + 1;

  // Check if all candidates have been voted on
  if (nextIndex >= candidates.length) {
    return { ok: true, allDone: true };
  }

  // Check if advancing TO the last candidate
  const isAdvancingToLastCandidate = nextIndex === candidates.length - 1;

  // Advance to next candidate and clear voting_started_at for new vote
  const { data: updatedSession, error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      current_candidate_index: nextIndex,
      voting_started_at: null,
    })
    .eq("id", votingSession.id)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return { ok: false, message: updateErr?.message ?? "Failed to advance candidate" };
  }

  // If advancing to last candidate, apply auto-votes for non-voters
  if (isAdvancingToLastCandidate) {
    await applyAutoVotesInternal(gameId);
  }

  // Publish updated session state via LiveKit (votes unchanged, candidate advanced)
  await publishVotingSessionState(gameId, updatedSession);

  return { ok: true, allDone: false };
}

/**
 * Internal helper to apply auto-votes without auth check.
 * Used when advancing to last candidate.
 *
 * ATOMIC: Batch INSERT with is_auto_vote=true, conflict ignored.
 */
async function applyAutoVotesInternal(gameId: string): Promise<void> {
  // Get voting session
  const { data: votingSession } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (!votingSession) return;

  // Get the game to find host_id
  const { data: game } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  // Get all alive players
  const { data: alivePlayers } = await adminClient
    .from("game_players")
    .select("seat_number, player_id")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  if (!alivePlayers) return;

  // Filter out the host (host doesn't vote)
  const allAliveSeats = alivePlayers
    .filter((p) => p.player_id !== game?.host_id)
    .map((p) => p.seat_number)
    .filter((s): s is number => s !== null);

  // Get existing votes to find who already voted
  const existingVotes = await getVotesForSession(votingSession.id);
  const playersWhoVoted = getPlayersWhoVoted(existingVotes);

  const candidates = votingSession.candidates ?? [];

  // Find players who didn't vote
  const playersWhoDidntVote = allAliveSeats.filter(
    (seat) => !playersWhoVoted.includes(seat)
  );

  if (playersWhoDidntVote.length === 0) return;

  // Get the last candidate
  const lastCandidate = candidates[candidates.length - 1];
  if (lastCandidate === undefined) return;

  // Batch INSERT auto-votes (use upsert to ignore conflicts)
  const autoVotes = playersWhoDidntVote.map((voterSeat) => ({
    voting_session_id: votingSession.id,
    voter_seat: voterSeat,
    seat_number: lastCandidate,
    is_both_leave: false,
    is_auto_vote: true,
  }));

  // Insert with onConflict ignore to handle any race conditions
  await adminClient
    .from("votes")
    .upsert(autoVotes, { onConflict: "voting_session_id,voter_seat", ignoreDuplicates: true });
}

/**
 * Get the current voting session for a game.
 * Returns null if no voting session exists.
 */
export async function getVotingSession(
  gameId: string
): Promise<Tables<"voting_sessions"> | null> {
  const { data } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .maybeSingle();

  return data;
}

// ============================================================================
// TASK 3: Results Processing Actions
// ============================================================================

/**
 * Apply auto-votes for players who didn't vote.
 * Players who didn't vote for any candidate automatically vote for the LAST candidate.
 * Called after all candidates have been voted on, before processing results.
 * Host only.
 */
export async function applyAutoVotes(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  // Get all alive players (non-candidates can vote)
  const { data: alivePlayers, error: playersErr } = await adminClient
    .from("game_players")
    .select("seat_number")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  if (playersErr || !alivePlayers) {
    return { ok: false, message: "Failed to fetch players" };
  }

  const allAliveSeats = alivePlayers
    .map((p) => p.seat_number)
    .filter((s): s is number => s !== null);

  // Get existing votes
  const existingVotes = await getVotesForSession(votingSession.id);
  const playersWhoVoted = getPlayersWhoVoted(existingVotes);

  const candidates = votingSession.candidates ?? [];

  // Find players who didn't vote
  const playersWhoDidntVote = allAliveSeats.filter(
    (seat) => !playersWhoVoted.includes(seat)
  );

  if (playersWhoDidntVote.length === 0) {
    // Everyone voted, nothing to do
    return { ok: true };
  }

  // Get the last candidate
  const lastCandidate = candidates[candidates.length - 1];
  if (lastCandidate === undefined) {
    return { ok: false, message: "No candidates found" };
  }

  // Batch INSERT auto-votes
  const autoVotes = playersWhoDidntVote.map((voterSeat) => ({
    voting_session_id: votingSession.id,
    voter_seat: voterSeat,
    seat_number: lastCandidate,
    is_both_leave: false,
    is_auto_vote: true,
  }));

  const { error: insertErr } = await adminClient
    .from("votes")
    .upsert(autoVotes, { onConflict: "voting_session_id,voter_seat", ignoreDuplicates: true });

  if (insertErr) {
    return { ok: false, message: insertErr.message };
  }

  return { ok: true };
}

/**
 * Process voting results after all candidates have been voted on.
 * Determines if there's a clear winner or a tie.
 *
 * Returns:
 * - { result: "winner", winner: seatNumber } - Clear winner with most votes
 * - { result: "tie", tiedCandidates: seatNumbers[] } - Tie between multiple candidates
 *
 * Host only.
 */
export async function processVotingResults(
  gameId: string
): Promise<
  | { ok: true; result: "winner"; winner: number }
  | { ok: true; result: "tie"; tiedCandidates: number[] }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Note: auto-votes are already applied when advancing to last candidate

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  const candidates = votingSession.candidates ?? [];

  // Get all votes from vote table
  const allVotes = await getVotesForSession(votingSession.id);
  const votesMap = buildVotesMap(allVotes);

  // Count votes for each candidate
  const voteCounts: { seat: number; count: number }[] = candidates.map(
    (seat) => ({
      seat,
      count: (votesMap[String(seat)] ?? []).length,
    })
  );

  // Sort by vote count descending
  voteCounts.sort((a, b) => b.count - a.count);

  // Find the maximum vote count
  const maxVotes = voteCounts[0]?.count ?? 0;

  // Find all candidates with the maximum votes
  const topCandidates = voteCounts
    .filter((vc) => vc.count === maxVotes)
    .map((vc) => vc.seat);

  if (topCandidates.length === 1) {
    // Clear winner
    return { ok: true, result: "winner", winner: topCandidates[0] };
  } else {
    // Tie between multiple candidates
    return { ok: true, result: "tie", tiedCandidates: topCandidates };
  }
}

// ============================================================================
// TASK 4: Tie-break Actions
// ============================================================================

/**
 * Start tie-break when voting results in a tie.
 * If same candidates tie twice, triggers "both leave" vote instead.
 *
 * Flow:
 * - First tie: Set up re-vote with tied candidates, go to nominated_players_speak for 30s justifications
 * - Same candidates tie again: Trigger "both leave" vote
 *
 * Host only.
 */
export async function startTieBreak(
  gameId: string,
  tiedCandidates: number[]
): Promise<ActionResult & { bothLeaveVote?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get current voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  const previousTied = votingSession.previous_tied_candidates ?? [];
  const currentTieBreakRound = votingSession.tie_break_round ?? 0;

  // Check if same candidates tied again (after at least one tie-break round)
  const sameCandidates =
    currentTieBreakRound > 0 &&
    previousTied.length === tiedCandidates.length &&
    previousTied.every((c) => tiedCandidates.includes(c));

  if (sameCandidates) {
    // Same players tied twice - trigger "both leave" vote
    // Delete all existing votes for this session before both-leave vote
    await adminClient
      .from("votes")
      .delete()
      .eq("voting_session_id", votingSession.id);

    const { data: updatedSession, error: updateErr } = await adminClient
      .from("voting_sessions")
      .update({
        both_leave_vote_active: true,
        voting_active: false,
        voting_started_at: null,
      })
      .eq("game_id", gameId)
      .select()
      .single();

    if (updateErr || !updatedSession) {
      return { ok: false, message: updateErr?.message ?? "Failed to start both leave vote" };
    }

    // Publish updated session state (votes cleared)
    void publishVotingSessionState(gameId, updatedSession, {
      votes: {},
      playersWhoVoted: [],
      bothLeaveVoters: [],
    });

    return { ok: true, bothLeaveVote: true };
  }

  // Normal tie-break: delete votes and reset for re-vote
  await adminClient
    .from("votes")
    .delete()
    .eq("voting_session_id", votingSession.id);

  const { data: updatedSession, error: updateVotingErr } = await adminClient
    .from("voting_sessions")
    .update({
      is_tie_break: true,
      tie_break_round: currentTieBreakRound + 1,
      candidates: tiedCandidates,
      previous_tied_candidates: tiedCandidates,
      votes: {}, // Legacy
      players_who_voted: [], // Legacy
      current_candidate_index: 0,
      voting_active: false,
      voting_started_at: null,
    })
    .eq("game_id", gameId)
    .select()
    .single();

  if (updateVotingErr || !updatedSession) {
    return { ok: false, message: updateVotingErr?.message ?? "Failed to start tie break" };
  }

  // Publish updated session state (votes cleared for tie-break)
  void publishVotingSessionState(gameId, updatedSession, {
    votes: {},
    playersWhoVoted: [],
    bothLeaveVoters: [],
  });

  // Update game session for tie-break justification (30s each)
  const { error: updateGameErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "nominated_players_speak",
      speaking_order: tiedCandidates,
      current_speaker_index: tiedCandidates[0],
      speaker_started_at: new Date().toISOString(),
    })
    .eq("game_id", gameId);

  if (updateGameErr) {
    return { ok: false, message: updateGameErr.message };
  }

  return { ok: true, bothLeaveVote: false };
}

/**
 * Start the "both leave" voting window.
 * Enables voting for whether all tied candidates should leave.
 * Automatically ends the voting window after VOTE_WINDOW_MS.
 * Host only.
 */
export async function startBothLeaveVote(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session to get its ID
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("id")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  const { data: updatedSession, error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: true,
      voting_started_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return { ok: false, message: updateErr?.message ?? "Failed to start both leave vote window" };
  }

  // Publish voting STARTED state via LiveKit (all clients see this immediately)
  await publishVotingSessionState(gameId, updatedSession);

  // Wait for the voting window duration (server-side timer)
  await new Promise(resolve => setTimeout(resolve, VOTING.VOTE_WINDOW_MS));

  // End voting window
  const { data: endedSession, error: endErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: false,
    })
    .eq("id", votingSession.id)
    .select()
    .single();

  if (endErr || !endedSession) {
    return { ok: false, message: endErr?.message ?? "Failed to end both leave vote window" };
  }

  // Publish voting ENDED state via LiveKit
  await publishVotingSessionState(gameId, endedSession);

  return { ok: true };
}

/**
 * End the "both leave" voting window.
 * Host only.
 */
export async function endBothLeaveVote(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  const { data: updatedSession, error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: false,
    })
    .eq("game_id", gameId)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return { ok: false, message: updateErr?.message ?? "Failed to end both leave vote window" };
  }

  // Publish updated session state via LiveKit
  void publishVotingSessionState(gameId, updatedSession);

  return { ok: true };
}

/**
 * Cast a vote in the "both leave" vote.
 * Player votes for all tied candidates to leave.
 *
 * ATOMIC: Uses INSERT into vote table with unique constraint.
 */
export async function castBothLeaveVote(gameId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  // Get player's seat number
  const { data: player, error: playerErr } = await adminClient
    .from("game_players")
    .select("seat_number, is_alive")
    .eq("game_id", gameId)
    .eq("player_id", user.id)
    .single();

  if (playerErr || !player) {
    return { ok: false, message: "Player not found" };
  }

  if (!player.is_alive) {
    return { ok: false, message: "Dead players cannot vote" };
  }

  const seatNumber = player.seat_number;
  if (seatNumber === null) {
    return { ok: false, message: "Player has no seat" };
  }

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  if (!votingSession.both_leave_vote_active) {
    return { ok: false, message: "Both leave vote is not active" };
  }

  if (!votingSession.voting_active) {
    return { ok: false, message: "Voting window is not open" };
  }

  // ATOMIC INSERT - unique constraint prevents duplicate votes
  const { error: insertErr } = await adminClient.from("votes").insert({
    voting_session_id: votingSession.id,
    voter_seat: seatNumber,
    seat_number: null, // No specific candidate for both-leave vote
    is_both_leave: true,
    is_auto_vote: false,
  });

  if (insertErr) {
    // Check if it's a unique constraint violation (already voted)
    if (insertErr.code === "23505") {
      return { ok: false, message: "Already voted" };
    }
    return { ok: false, message: insertErr.message };
  }

  // Publish vote via LiveKit for real-time sync (fire-and-forget, DB is source of truth)
  void publishVoteCast(gameId, seatNumber, null, true);

  return { ok: true };
}

/**
 * Process the "both leave" vote result.
 * Returns whether all tied candidates should leave (>50% voted yes).
 * Host only.
 */
export async function processBothLeaveResult(gameId: string): Promise<
  | {
      ok: true;
      allLeave: boolean;
      candidates: number[];
      voteCount: number;
      totalVoters: number;
    }
  | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Get voting session
  const { data: votingSession, error: sessionErr } = await adminClient
    .from("voting_sessions")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !votingSession) {
    return { ok: false, message: "Voting session not found" };
  }

  // Get game host_id
  const { data: game } = await adminClient
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single();

  // Get total alive players (excluding host)
  const { data: alivePlayers } = await adminClient
    .from("game_players")
    .select("seat_number, player_id")
    .eq("game_id", gameId)
    .eq("is_alive", true);

  const totalVoters = (alivePlayers ?? []).filter(
    (p) => p.player_id !== game?.host_id
  ).length;

  // Get votes from vote table
  const allVotes = await getVotesForSession(votingSession.id);
  const bothLeaveVoters = getBothLeaveVoters(allVotes);
  const voteCount = bothLeaveVoters.length;

  const candidates = votingSession.candidates ?? [];

  // Check if >50% voted yes
  const threshold = VOTING.BOTH_LEAVE_THRESHOLD;
  const allLeave = totalVoters > 0 && voteCount / totalVoters > threshold;

  return { ok: true, allLeave, candidates, voteCount, totalVoters };
}

/**
 * Start farewell speech for multiple candidates (both/all leave scenario).
 * All tied candidates get farewell speeches.
 * Host only.
 */
export async function startBothLeaveFarewell(
  gameId: string,
  candidates: number[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Delete voting session - voting has ended (votes cascade delete)
  await adminClient.from("voting_sessions").delete().eq("game_id", gameId);

  // Publish null session state via LiveKit (session ended)
  void publishVotingSessionState(gameId, null);

  // Update game session to farewell_speech with all candidates as speakers
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "farewell_speech",
      speaking_order: candidates,
      current_speaker_index: null,
      speaker_started_at: null,
    })
    .eq("game_id", gameId);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Skip to night phase when "both leave" vote fails (no one leaves).
 * Host only.
 */
export async function skipToNightAfterTie(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Delete voting session (votes cascade delete)
  await adminClient.from("voting_sessions").delete().eq("game_id", gameId);

  // Publish null session state via LiveKit (session ended)
  void publishVotingSessionState(gameId, null);

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const newNightNumber = (gameSession.current_night_number || 0) + 1;

  // Update game session to night phase
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "night_phase",
      current_night_number: newNightNumber,
      speaking_order: [],
      current_speaker_index: null,
      speaker_started_at: null,
      nominated_players: [],
      foul_elimination_occurred: false, // Reset foul elimination flag for new round
    })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // Create night_phase_sessions row for the new night
  const { data: existingNight } = await adminClient
    .from("night_phase_sessions")
    .select("id")
    .eq("game_id", gameId)
    .eq("night_number", newNightNumber)
    .maybeSingle();

  if (!existingNight) {
    await adminClient.from("night_phase_sessions").insert({
      game_id: gameId,
      night_number: newNightNumber,
    });
  }

  return { ok: true };
}

/**
 * Start farewell speech for the voting winner.
 * Sets up the farewell speech phase with the winner as the only speaker.
 * After farewell ends, markDeadAndAdvance will detect the voting session
 * and transition to night phase instead of day phase.
 * Host only.
 */
export async function startVotingFarewell(
  gameId: string,
  winnerSeatNumber: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Delete voting session - voting has ended (votes cascade delete)
  await adminClient.from("voting_sessions").delete().eq("game_id", gameId);

  // Publish null session state via LiveKit (session ended)
  void publishVotingSessionState(gameId, null);

  // Update game session to farewell_speech with winner as speaker
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "farewell_speech",
      speaking_order: [winnerSeatNumber],
      current_speaker_index: null,
      speaker_started_at: null,
    })
    .eq("game_id", gameId);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Transition to night phase after voting is complete.
 * Cleans up the voting session and updates game phase.
 * Also creates the night_phase_sessions row for the new night.
 * Host only.
 */
export async function transitionToNightPhase(
  gameId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Not authenticated" };

  const hostCheck = await verifyHost(gameId, user.id);
  if (!hostCheck.ok) return hostCheck;

  // Delete voting session (votes cascade delete)
  await adminClient.from("voting_sessions").delete().eq("game_id", gameId);

  // Publish null session state via LiveKit (session ended)
  void publishVotingSessionState(gameId, null);

  // Get current game session
  const { data: gameSession, error: sessionErr } = await adminClient
    .from("game_sessions")
    .select("id, current_night_number")
    .eq("game_id", gameId)
    .single();

  if (sessionErr || !gameSession) {
    return { ok: false, message: "Game session not found" };
  }

  const newNightNumber = (gameSession.current_night_number || 0) + 1;

  // Update game session to night phase
  const { error: updateErr } = await adminClient
    .from("game_sessions")
    .update({
      game_phase: "night_phase",
      current_night_number: newNightNumber,
      speaking_order: [],
      current_speaker_index: null,
      speaker_started_at: null,
      nominated_players: [],
      foul_elimination_occurred: false, // Reset foul elimination flag for new round
    })
    .eq("id", gameSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // Create night_phase_sessions row for the new night
  const { data: existingNight } = await adminClient
    .from("night_phase_sessions")
    .select("id")
    .eq("game_id", gameId)
    .eq("night_number", newNightNumber)
    .maybeSingle();

  if (!existingNight) {
    const { error: nightErr } = await adminClient
      .from("night_phase_sessions")
      .insert({
        game_id: gameId,
        night_number: newNightNumber,
      });

    if (nightErr) {
      console.error("Failed to create night phase session:", nightErr);
      // Don't fail the transition, just log the error
    }
  }

  return { ok: true };
}
