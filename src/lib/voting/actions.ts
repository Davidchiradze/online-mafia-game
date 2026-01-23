"use server";

/**
 * Voting Phase Server Actions
 *
 * Core voting flow:
 * 1. initializeVoting - Create voting session with candidates from nominated_players
 * 2. startVoteWindow - Enable voting for 5 seconds
 * 3. castVote - Player casts vote for current candidate
 * 4. endVoteWindow - Close voting window
 * 5. advanceToNextCandidate - Move to next candidate
 *
 * Players CAN vote for themselves.
 * Players who don't vote get auto-assigned to last candidate (handled in Task 3).
 */

import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import type { Tables, Json } from "@/db/supabase/database.types";

type ActionResult = { ok: true } | { ok: false; message: string };

/** Votes map: { "seatNumber": [voterSeatNumbers] } */
type VotesMap = Record<string, number[]>;

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
 */
export async function initializeVoting(
  gameId: string
): Promise<ActionResult & { alreadyExists?: boolean }> {
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
    .select("id")
    .eq("game_id", gameId)
    .maybeSingle();

  if (existing) {
    return { ok: true, alreadyExists: true };
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

  // Create voting session
  const { error: insertErr } = await adminClient
    .from("voting_sessions")
    .insert({
      game_id: gameId,
      candidates,
      round_number: 1,
      current_candidate_index: 0,
      voting_active: false,
      votes: {},
      players_who_voted: [],
      is_tie_break: false,
      tie_break_round: 0,
      both_leave_vote_active: false,
      both_leave_votes: [],
    });

  if (insertErr) {
    return { ok: false, message: insertErr.message };
  }

  return { ok: true };
}

/**
 * Start the voting window for the current candidate.
 * Sets voting_active=true and voting_started_at to current time.
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
  const { error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: true,
      voting_started_at: new Date().toISOString(),
    })
    .eq("id", votingSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

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
  const { error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      voting_active: false,
    })
    .eq("id", votingSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Cast a vote for the current candidate.
 * Called by players during the voting window.
 * Players CAN vote for themselves.
 * Each player can only vote once per voting round.
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

  // Check if player already voted this round
  const playersWhoVoted = votingSession.players_who_voted ?? [];
  if (playersWhoVoted.includes(voterSeat)) {
    return { ok: false, message: "You have already voted this round" };
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

  // Update votes
  const votes = (votingSession.votes as VotesMap) ?? {};
  const candidateKey = String(currentCandidate);
  const candidateVotes = votes[candidateKey] ?? [];

  // Add voter to the candidate's votes
  const updatedVotes: VotesMap = {
    ...votes,
    [candidateKey]: [...candidateVotes, voterSeat],
  };

  // Add voter to players_who_voted
  const updatedPlayersWhoVoted = [...playersWhoVoted, voterSeat];

  const { error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      votes: updatedVotes as unknown as Json,
      players_who_voted: updatedPlayersWhoVoted,
    })
    .eq("id", votingSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  return { ok: true };
}

/**
 * Advance to the next candidate in the voting sequence.
 * Clears players_who_voted for the new candidate.
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
  const { error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      current_candidate_index: nextIndex,
      voting_started_at: null,
    })
    .eq("id", votingSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  // If advancing to last candidate, apply auto-votes for non-voters
  if (isAdvancingToLastCandidate) {
    await applyAutoVotesInternal(gameId);
  }

  return { ok: true, allDone: false };
}

/**
 * Internal helper to apply auto-votes without auth check.
 * Used when advancing to last candidate.
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

  const playersWhoVoted = votingSession.players_who_voted ?? [];
  const candidates = votingSession.candidates ?? [];

  // Find players who didn't vote
  const playersWhoDidntVote = allAliveSeats.filter(
    (seat) => !playersWhoVoted.includes(seat)
  );

  if (playersWhoDidntVote.length === 0) return;

  // Get the last candidate
  const lastCandidate = candidates[candidates.length - 1];
  if (lastCandidate === undefined) return;

  // Add auto-votes to the last candidate
  const votes = (votingSession.votes as VotesMap) ?? {};
  const lastCandidateKey = String(lastCandidate);
  const lastCandidateVotes = votes[lastCandidateKey] ?? [];

  const updatedVotes: VotesMap = {
    ...votes,
    [lastCandidateKey]: [...lastCandidateVotes, ...playersWhoDidntVote],
  };

  // Update players_who_voted to include auto-voters
  const updatedPlayersWhoVoted = [...playersWhoVoted, ...playersWhoDidntVote];

  await adminClient
    .from("voting_sessions")
    .update({
      votes: updatedVotes as unknown as Json,
      players_who_voted: updatedPlayersWhoVoted,
    })
    .eq("id", votingSession.id);
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

  const playersWhoVoted = votingSession.players_who_voted ?? [];
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

  // Add auto-votes to the last candidate
  const votes = (votingSession.votes as VotesMap) ?? {};
  const lastCandidateKey = String(lastCandidate);
  const lastCandidateVotes = votes[lastCandidateKey] ?? [];

  const updatedVotes: VotesMap = {
    ...votes,
    [lastCandidateKey]: [...lastCandidateVotes, ...playersWhoDidntVote],
  };

  // Update players_who_voted to include auto-voters
  const updatedPlayersWhoVoted = [...playersWhoVoted, ...playersWhoDidntVote];

  const { error: updateErr } = await adminClient
    .from("voting_sessions")
    .update({
      votes: updatedVotes as unknown as Json,
      players_who_voted: updatedPlayersWhoVoted,
    })
    .eq("id", votingSession.id);

  if (updateErr) {
    return { ok: false, message: updateErr.message };
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
  const votes = (votingSession.votes as VotesMap) ?? {};

  // Count votes for each candidate
  const voteCounts: { seat: number; count: number }[] = candidates.map(
    (seat) => ({
      seat,
      count: (votes[String(seat)] ?? []).length,
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

  // Delete voting session
  await adminClient.from("voting_sessions").delete().eq("game_id", gameId);

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
