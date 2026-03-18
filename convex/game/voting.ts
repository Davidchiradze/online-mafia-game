import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { assertIsHost, getPlayerInGame } from "../lib/games";
import { voting as votingRefs } from "../refs/game";
import { VOTING } from "../lib/constants";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "../_generated/server";

// ============================================================================
// HELPERS
// ============================================================================

async function getVotingSessionByGameId(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  return await db
    .query("votingSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
}

async function requireVotingSession(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  const session = await getVotingSessionByGameId(db, gameId);
  if (!session) throw new Error("Voting session not found");
  return session;
}

async function getVotesForSession(
  db: DatabaseReader,
  votingSessionId: Id<"votingSessions">,
) {
  return await db
    .query("votes")
    .withIndex("by_votingSessionId", (q) =>
      q.eq("votingSessionId", votingSessionId),
    )
    .collect();
}

async function deleteVotesForSession(
  db: DatabaseWriter,
  votingSessionId: Id<"votingSessions">,
) {
  const votes = await db
    .query("votes")
    .withIndex("by_votingSessionId", (q) =>
      q.eq("votingSessionId", votingSessionId),
    )
    .collect();

  for (const vote of votes) {
    await db.delete(vote._id);
  }
}

async function getAliveNonHostSeats(
  db: DatabaseReader,
  gameId: Id<"games">,
  hostId: Id<"profiles">,
) {
  const players = await db
    .query("gamePlayers")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  return players
    .filter((p) => p.isAlive && p.playerId !== hostId)
    .map((p) => p.seatNumber)
    .filter((s): s is number => s !== undefined);
}

// ============================================================================
// QUERIES
// ============================================================================

export const getSession = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await getVotingSessionByGameId(ctx.db, gameId);
  },
});

export const getVotes = query({
  args: { votingSessionId: v.id("votingSessions") },
  handler: async (ctx, { votingSessionId }) => {
    return await getVotesForSession(ctx.db, votingSessionId);
  },
});

// ============================================================================
// SESSION LIFECYCLE
// ============================================================================

export const createSession = mutation({
  args: {
    gameId: v.id("games"),
    candidates: v.array(v.number()),
  },
  handler: async (ctx, { gameId, candidates }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const existing = await getVotingSessionByGameId(ctx.db, gameId);
    if (existing) return existing._id;

    if (candidates.length === 0) throw new Error("No candidates to vote on");

    return await ctx.db.insert("votingSessions", {
      gameId,
      candidates,
      roundNumber: 1,
      currentCandidateIndex: 0,
      votingActive: false,
      isTieBreak: false,
      tieBreakRound: 0,
      bothLeaveVoteActive: false,
      playersWhoVoted: [],
    });
  },
});

export const initializeVoting = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const existing = await getVotingSessionByGameId(ctx.db, gameId);
    if (existing) return existing._id;

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!session) throw new Error("Game session not found");
    if (session.gamePhase !== "voting") throw new Error("Not in voting phase");

    const candidates = session.nominatedPlayers ?? [];
    if (candidates.length === 0) throw new Error("No candidates to vote on");

    return await ctx.db.insert("votingSessions", {
      gameId,
      candidates,
      roundNumber: 1,
      currentCandidateIndex: 0,
      votingActive: false,
      isTieBreak: false,
      tieBreakRound: 0,
      bothLeaveVoteActive: false,
      playersWhoVoted: [],
    });
  },
});

// ============================================================================
// VOTING WINDOW
// ============================================================================

export const startVoteWindow = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    if (session.votingActive) throw new Error("Voting is already active");

    await ctx.db.patch(session._id, {
      votingActive: true,
      votingStartedAt: new Date().toISOString(),
    });

    await ctx.scheduler.runAfter(
      VOTING.VOTE_WINDOW_MS,
      votingRefs.endVoteWindowInternal,
      { gameId },
    );
  },
});

export const endVoteWindowInternal = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session?.votingActive) {
      await ctx.db.patch(session._id, { votingActive: false });
    }
  },
});

export const endVoteWindow = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    if (!session.votingActive) throw new Error("Voting is not active");

    await ctx.db.patch(session._id, { votingActive: false });
  },
});

// ============================================================================
// CASTING VOTES
// ============================================================================

export const castVote = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);

    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player || player.seatNumber === undefined) {
      throw new Error("Player not found in game");
    }
    if (!player.isAlive) throw new Error("Dead players cannot vote");

    const session = await requireVotingSession(ctx.db, gameId);
    const candidates = session.candidates ?? [];
    const currentCandidate = candidates[session.currentCandidateIndex ?? 0];
    if (currentCandidate === undefined) throw new Error("No candidate to vote for");

    // Check for duplicate vote
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_votingSessionId_voterSeat", (q) =>
        q.eq("votingSessionId", session._id).eq("voterSeat", player.seatNumber!),
      )
      .unique();

    if (existingVote) throw new Error("You have already voted this round");

    await ctx.db.insert("votes", {
      votingSessionId: session._id,
      voterSeat: player.seatNumber,
      seatNumber: currentCandidate,
      isBothLeave: false,
      isAutoVote: false,
    });
  },
});

export const castBothLeaveVote = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);

    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player || player.seatNumber === undefined) {
      throw new Error("Player not found in game");
    }
    if (!player.isAlive) throw new Error("Dead players cannot vote");

    const session = await requireVotingSession(ctx.db, gameId);

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_votingSessionId_voterSeat", (q) =>
        q.eq("votingSessionId", session._id).eq("voterSeat", player.seatNumber!),
      )
      .unique();

    if (existingVote) throw new Error("Already voted");

    await ctx.db.insert("votes", {
      votingSessionId: session._id,
      voterSeat: player.seatNumber,
      isBothLeave: true,
      isAutoVote: false,
    });
  },
});

// ============================================================================
// CANDIDATE ADVANCEMENT
// ============================================================================

export const advanceCandidate = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    if (session.votingActive) throw new Error("Cannot advance while voting is active");

    const candidates = session.candidates ?? [];
    const currentIndex = session.currentCandidateIndex ?? 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= candidates.length) {
      return { allDone: true };
    }

    const isAdvancingToLastCandidate = nextIndex === candidates.length - 1;

    await ctx.db.patch(session._id, {
      currentCandidateIndex: nextIndex,
      votingStartedAt: undefined,
    });

    // Auto-vote for non-voters when advancing to last candidate
    if (isAdvancingToLastCandidate) {
      const aliveSeats = await getAliveNonHostSeats(ctx.db, gameId, game.hostId);
      const existingVotes = await getVotesForSession(ctx.db, session._id);
      const playersWhoVoted = existingVotes
        .filter((v) => !v.isBothLeave)
        .map((v) => v.voterSeat);

      const lastCandidate = candidates[candidates.length - 1];
      if (lastCandidate !== undefined) {
        for (const seat of aliveSeats) {
          if (!playersWhoVoted.includes(seat)) {
            const alreadyVoted = await ctx.db
              .query("votes")
              .withIndex("by_votingSessionId_voterSeat", (q) =>
                q.eq("votingSessionId", session._id).eq("voterSeat", seat),
              )
              .unique();

            if (!alreadyVoted) {
              await ctx.db.insert("votes", {
                votingSessionId: session._id,
                voterSeat: seat,
                seatNumber: lastCandidate,
                isBothLeave: false,
                isAutoVote: true,
              });
            }
          }
        }
      }
    }

    return { allDone: false };
  },
});

// ============================================================================
// RESULTS PROCESSING
// ============================================================================

export const processResults = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    const candidates = session.candidates ?? [];

    const allVotes = await getVotesForSession(ctx.db, session._id);

    const voteCounts: { seat: number; count: number }[] = candidates.map((seat) => ({
      seat,
      count: allVotes.filter(
        (v) => v.seatNumber === seat && !v.isBothLeave,
      ).length,
    }));

    voteCounts.sort((a, b) => b.count - a.count);
    const maxVotes = voteCounts[0]?.count ?? 0;
    const topCandidates = voteCounts
      .filter((vc) => vc.count === maxVotes)
      .map((vc) => vc.seat);

    if (topCandidates.length === 1) {
      return { result: "winner" as const, winner: topCandidates[0] };
    }
    return { result: "tie" as const, tiedCandidates: topCandidates };
  },
});

// ============================================================================
// TIE-BREAK
// ============================================================================

export const startTieBreak = mutation({
  args: {
    gameId: v.id("games"),
    tiedCandidates: v.array(v.number()),
  },
  handler: async (ctx, { gameId, tiedCandidates }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    const previousTied = session.previousTiedCandidates ?? [];
    const currentTieBreakRound = session.tieBreakRound ?? 0;

    const sameCandidates =
      currentTieBreakRound > 0 &&
      previousTied.length === tiedCandidates.length &&
      previousTied.every((c) => tiedCandidates.includes(c));

    await deleteVotesForSession(ctx.db, session._id);

    if (sameCandidates) {
      await ctx.db.patch(session._id, {
        bothLeaveVoteActive: true,
        votingActive: false,
        votingStartedAt: undefined,
      });
      return { bothLeaveVote: true };
    }

    await ctx.db.patch(session._id, {
      isTieBreak: true,
      tieBreakRound: currentTieBreakRound + 1,
      candidates: tiedCandidates,
      previousTiedCandidates: tiedCandidates,
      playersWhoVoted: [],
      currentCandidateIndex: 0,
      votingActive: false,
      votingStartedAt: undefined,
    });

    // Update game session for tie-break justification
    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (gameSession) {
      await ctx.db.patch(gameSession._id, {
        gamePhase: "nominated_players_speak",
        speakingOrder: tiedCandidates,
        currentSpeakerIndex: tiedCandidates[0],
        speakerStartedAt: new Date().toISOString(),
      });
    }

    return { bothLeaveVote: false };
  },
});

// ============================================================================
// BOTH LEAVE
// ============================================================================

export const startBothLeaveVote = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);

    await ctx.db.patch(session._id, {
      votingActive: true,
      votingStartedAt: new Date().toISOString(),
    });

    await ctx.scheduler.runAfter(
      VOTING.VOTE_WINDOW_MS,
      votingRefs.endBothLeaveVoteInternal,
      { gameId },
    );
  },
});

export const endBothLeaveVoteInternal = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session?.votingActive) {
      await ctx.db.patch(session._id, { votingActive: false });
    }
  },
});

export const endBothLeaveVote = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);

    await ctx.db.patch(session._id, { votingActive: false });
  },
});

export const processBothLeaveResult = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    const session = await requireVotingSession(ctx.db, gameId);
    const allVotes = await getVotesForSession(ctx.db, session._id);

    const bothLeaveVoters = allVotes
      .filter((v) => v.isBothLeave)
      .map((v) => v.voterSeat);

    const aliveSeats = await getAliveNonHostSeats(ctx.db, gameId, game.hostId);
    const totalVoters = aliveSeats.length;
    const voteCount = bothLeaveVoters.length;

    const allLeave =
      totalVoters > 0 && voteCount / totalVoters > VOTING.BOTH_LEAVE_THRESHOLD;

    return {
      allLeave,
      candidates: session.candidates ?? [],
      voteCount,
      totalVoters,
    };
  },
});

// ============================================================================
// FAREWELL & CLEANUP
// ============================================================================

export const startVotingFarewell = mutation({
  args: {
    gameId: v.id("games"),
    winnerSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, winnerSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session) {
      await deleteVotesForSession(ctx.db, session._id);
      await ctx.db.delete(session._id);
    }

    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (gameSession) {
      await ctx.db.patch(gameSession._id, {
        gamePhase: "farewell_speech",
        speakingOrder: [winnerSeatNumber],
        currentSpeakerIndex: undefined,
        speakerStartedAt: undefined,
      });
    }
  },
});

export const startBothLeaveFarewell = mutation({
  args: {
    gameId: v.id("games"),
    candidates: v.array(v.number()),
  },
  handler: async (ctx, { gameId, candidates }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session) {
      await deleteVotesForSession(ctx.db, session._id);
      await ctx.db.delete(session._id);
    }

    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (gameSession) {
      await ctx.db.patch(gameSession._id, {
        gamePhase: "farewell_speech",
        speakingOrder: candidates,
        currentSpeakerIndex: undefined,
        speakerStartedAt: undefined,
      });
    }
  },
});

export const skipToNightAfterTie = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session) {
      await deleteVotesForSession(ctx.db, session._id);
      await ctx.db.delete(session._id);
    }

    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!gameSession) throw new Error("Game session not found");

    const newNightNumber = (gameSession.currentNightNumber || 0) + 1;

    await ctx.db.patch(gameSession._id, {
      gamePhase: "night_phase",
      currentNightNumber: newNightNumber,
      speakingOrder: [],
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
      nominatedPlayers: [],
      foulEliminationOccurred: false,
    });

    const existingNight = await ctx.db
      .query("nightPhaseSessions")
      .withIndex("by_gameId_nightNumber", (q) =>
        q.eq("gameId", gameId).eq("nightNumber", newNightNumber),
      )
      .unique();

    if (!existingNight) {
      await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber: newNightNumber,
      });
    }
  },
});

export const transitionToNightPhase = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session) {
      await deleteVotesForSession(ctx.db, session._id);
      await ctx.db.delete(session._id);
    }

    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!gameSession) throw new Error("Game session not found");

    const newNightNumber = (gameSession.currentNightNumber || 0) + 1;

    await ctx.db.patch(gameSession._id, {
      gamePhase: "night_phase",
      currentNightNumber: newNightNumber,
      speakingOrder: [],
      currentSpeakerIndex: undefined,
      speakerStartedAt: undefined,
      nominatedPlayers: [],
      foulEliminationOccurred: false,
    });

    const existingNight = await ctx.db
      .query("nightPhaseSessions")
      .withIndex("by_gameId_nightNumber", (q) =>
        q.eq("gameId", gameId).eq("nightNumber", newNightNumber),
      )
      .unique();

    if (!existingNight) {
      await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber: newNightNumber,
      });
    }
  },
});

export const deleteSession = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getVotingSessionByGameId(ctx.db, gameId);
    if (session) {
      await deleteVotesForSession(ctx.db, session._id);
      await ctx.db.delete(session._id);
    }
  },
});
