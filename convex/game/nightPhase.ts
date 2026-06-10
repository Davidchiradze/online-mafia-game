import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { assertIsHost } from "../lib/games";
import { enterNightPhase } from "../lib/phaseTransitions";
import type { Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";

// ============================================================================
// HELPERS
// ============================================================================

async function getGameSession(db: DatabaseReader, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new Error("Game session not found");
  return session;
}

async function getNightSession(
  db: DatabaseReader,
  gameId: Id<"games">,
  nightNumber: number,
) {
  return await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId_nightNumber", (q) =>
      q.eq("gameId", gameId).eq("nightNumber", nightNumber),
    )
    .unique();
}

async function getAllHealedSeats(db: DatabaseReader, gameId: Id<"games">) {
  const sessions = await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  return sessions
    .map((s) => s.healedPlayer)
    .filter((p): p is number => p !== undefined);
}

async function getRoleMap(db: DatabaseReader, gameId: Id<"games">) {
  const roles = await db
    .query("gamePlayerRoles")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  const map = new Map<string, string>();
  for (const r of roles) {
    map.set(r.playerId, r.role);
  }
  return map;
}

async function getAlivePlayers(db: DatabaseReader, gameId: Id<"games">) {
  const players = await db
    .query("gamePlayers")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  return players.filter((p) => p.isAlive);
}

/**
 * Mafia kill authority: DON > MAFIA_RIGHT_HAND > MAFIA (first alive in priority).
 */
async function getMafiaKillAuthority(db: DatabaseReader, gameId: Id<"games">) {
  const alive = await getAlivePlayers(db, gameId);
  const roleMap = await getRoleMap(db, gameId);

  const aliveMafia: { playerId: Id<"profiles">; role: string }[] = [];
  for (const p of alive) {
    const role = roleMap.get(p.playerId);
    if (role === "DON" || role === "MAFIA_RIGHT_HAND" || role === "MAFIA") {
      aliveMafia.push({ playerId: p.playerId, role });
    }
  }

  return (
    aliveMafia.find((m) => m.role === "DON") ??
    aliveMafia.find((m) => m.role === "MAFIA_RIGHT_HAND") ??
    aliveMafia.find((m) => m.role === "MAFIA") ??
    null
  );
}

/**
 * Yakuza kill authority: SHOGUN (if YAKUZA alive) > YAKUZA (if SHOGUN dead).
 * SHOGUN alone cannot kill.
 */
async function getYakuzaKillAuthority(db: DatabaseReader, gameId: Id<"games">) {
  const alive = await getAlivePlayers(db, gameId);
  const roleMap = await getRoleMap(db, gameId);

  let aliveYakuza: { playerId: Id<"profiles">; role: string } | null = null;
  let aliveShogun: { playerId: Id<"profiles">; role: string } | null = null;

  for (const p of alive) {
    const role = roleMap.get(p.playerId);
    if (role === "YAKUZA") aliveYakuza = { playerId: p.playerId, role };
    if (role === "SHOGUN") aliveShogun = { playerId: p.playerId, role };
  }

  if (!aliveYakuza) return null;
  return aliveShogun ?? aliveYakuza;
}

async function getDoctorHealAuthority(db: DatabaseReader, gameId: Id<"games">) {
  const alive = await getAlivePlayers(db, gameId);
  const roleMap = await getRoleMap(db, gameId);

  for (const p of alive) {
    if (roleMap.get(p.playerId) === "DOCTOR") {
      return { playerId: p.playerId, role: "DOCTOR" };
    }
  }
  return null;
}

async function verifyTargetAlive(
  db: DatabaseReader,
  gameId: Id<"games">,
  targetSeatNumber: number,
) {
  const players = await db
    .query("gamePlayers")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  const target = players.find((p) => p.seatNumber === targetSeatNumber);
  if (!target) throw new Error("Target player not found");
  if (!target.isAlive) throw new Error("Cannot target a dead player");
  return target;
}

// ============================================================================
// QUERIES
// ============================================================================

export const getCurrent = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    if (!session || session.currentNightNumber === 0) return null;

    return await getNightSession(ctx.db, gameId, session.currentNightNumber);
  },
});

export const getHealedPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await getAllHealedSeats(ctx.db, gameId);
  },
});

export const checkMafiaAuthority = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const authority = await getMafiaKillAuthority(ctx.db, gameId);
    return {
      hasAuthority: authority?.playerId === userId,
      role: authority?.role ?? null,
    };
  },
});

export const checkYakuzaAuthority = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const authority = await getYakuzaKillAuthority(ctx.db, gameId);
    return {
      hasAuthority: authority?.playerId === userId,
      role: authority?.role ?? null,
    };
  },
});

export const checkDoctorAuthority = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const authority = await getDoctorHealAuthority(ctx.db, gameId);
    const healedPlayers = await getAllHealedSeats(ctx.db, gameId);
    return {
      hasAuthority: authority?.playerId === userId,
      role: authority?.role ?? null,
      healedPlayers,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Enter the night phase. Single client-facing entry point for every "go to
 * night" flow (intro → night, continue → night, day skip → night). Delegates
 * to the shared `enterNightPhase` helper so all state resets live in one place.
 */
export const enterNight = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);
    await enterNightPhase(ctx, gameId);
  },
});

export const selectMafiaTarget = mutation({
  args: {
    gameId: v.id("games"),
    targetSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, targetSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const authority = await getMafiaKillAuthority(ctx.db, gameId);
    if (!authority || authority.playerId !== userId) {
      throw new Error("You don't have authority to select a target");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "mafia_chooses_target") {
      throw new Error("Not in mafia target selection phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new Error("No active night");

    await verifyTargetAlive(ctx.db, gameId, targetSeatNumber);

    let nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) {
      const id = await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber,
      });
      nightSession = (await ctx.db.get(id))!;
    }

    if (nightSession.mafiaTarget !== undefined) {
      throw new Error("Target already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, { mafiaTarget: targetSeatNumber });
  },
});

export const selectYakuzaTarget = mutation({
  args: {
    gameId: v.id("games"),
    targetSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, targetSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const authority = await getYakuzaKillAuthority(ctx.db, gameId);
    if (!authority || authority.playerId !== userId) {
      throw new Error("You don't have authority to select a target");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "yakuza_and_shogun_chooses_target") {
      throw new Error("Not in Yakuza target selection phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new Error("No active night");

    await verifyTargetAlive(ctx.db, gameId, targetSeatNumber);

    let nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) {
      const id = await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber,
      });
      nightSession = (await ctx.db.get(id))!;
    }

    if (nightSession.yakuzaTarget !== undefined) {
      throw new Error("Target already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, { yakuzaTarget: targetSeatNumber });
  },
});

export const healPlayer = mutation({
  args: {
    gameId: v.id("games"),
    targetSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, targetSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const authority = await getDoctorHealAuthority(ctx.db, gameId);
    if (!authority || authority.playerId !== userId) {
      throw new Error("You don't have authority to heal");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "doctor_heals_player") {
      throw new Error("Not in doctor heal phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new Error("No active night");

    await verifyTargetAlive(ctx.db, gameId, targetSeatNumber);

    const healedPlayers = await getAllHealedSeats(ctx.db, gameId);
    if (healedPlayers.includes(targetSeatNumber)) {
      throw new Error("This player has already been healed once this game");
    }

    let nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) {
      const id = await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber,
      });
      nightSession = (await ctx.db.get(id))!;
    }

    if (nightSession.healedPlayer !== undefined) {
      throw new Error("Heal already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, { healedPlayer: targetSeatNumber });
  },
});
