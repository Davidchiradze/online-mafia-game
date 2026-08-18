import { ConvexError, v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getAuthenticatedUser } from "../../lib/auth";
import { assertIsHost } from "../../lib/games";
import { enterNightPhase } from "./phaseTransitions";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";
import { GamePhase } from "../../lib/constants";
import { isSerialKillerShotSpent } from "../../lib/nightSessions";
import { mafiaKillAuthority } from "./mafiaSuccession";

// ============================================================================
// HELPERS
// ============================================================================

async function getGameSession(db: DatabaseReader, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new ConvexError("Game session not found");
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
 * Mafia kill authority: the DON while alive, otherwise the living mafia in the
 * lowest-numbered seat. The rule itself is `mafiaKillAuthority`, shared with the
 * client so the button and the server agree; this only feeds it the table.
 */
async function getMafiaKillAuthority(db: DatabaseReader, gameId: Id<"games">) {
  const players = await getAlivePlayers(db, gameId);
  const roleMap = await getRoleMap(db, gameId);

  const authority = mafiaKillAuthority(
    players.map((p) => ({
      playerId: p.playerId,
      role: roleMap.get(p.playerId) ?? null,
      seatNumber: p.seatNumber,
      isAlive: p.isAlive,
    })),
  );

  if (!authority || authority.role === null) return null;
  return { playerId: authority.playerId, role: authority.role };
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
  if (!target) throw new ConvexError("Target player not found");
  if (!target.isAlive) throw new ConvexError("Cannot target a dead player");
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

/**
 * Who may fire the Serial Killer's shot — the living SERIAL_KILLER, or nobody.
 *
 * Unlike the mafia's, this authority has NO succession: the faction is one
 * player and the ability dies with them
 * (docs/variants/serial_killer/rules.md §4).
 */
async function getSerialKillerAuthority(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  const alive = await getAlivePlayers(db, gameId);
  const roleMap = await getRoleMap(db, gameId);

  for (const p of alive) {
    if (roleMap.get(p.playerId) === "SERIAL_KILLER") {
      return { playerId: p.playerId, role: "SERIAL_KILLER" };
    }
  }
  return null;
}

/**
 * Whether the caller may fire tonight, and why not if they may not.
 *
 * `canFire` folds together all three reasons the button should be dead — not
 * the Serial Killer, first night, or shot already spent — so the client never
 * re-derives a rule the server owns and then disagrees with it.
 */
export const checkSerialKillerAuthority = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const authority = await getSerialKillerAuthority(ctx.db, gameId);
    const session = await getGameSession(ctx.db, gameId);
    const shotSpent = await isSerialKillerShotSpent(ctx.db, gameId);
    const isFirstNight = session.currentNightNumber === 1;
    const hasAuthority = authority?.playerId === userId;

    return {
      hasAuthority,
      role: authority?.role ?? null,
      shotSpent,
      isFirstNight,
      canFire: hasAuthority && !shotSpent && !isFirstNight,
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
      throw new ConvexError("You don't have authority to select a target");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== GamePhase.MAFIA_CHOOSES_TARGET) {
      throw new ConvexError("Not in mafia target selection phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

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
      throw new ConvexError("Target already selected - cannot change decision");
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
      throw new ConvexError("You don't have authority to select a target");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET) {
      throw new ConvexError("Not in Yakuza target selection phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

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
      throw new ConvexError("Target already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, { yakuzaTarget: targetSeatNumber });
  },
});

/**
 * Fire the Serial Killer's one shot (docs/variants/serial_killer/rules.md §5).
 *
 * Sits beside `selectYakuzaTarget` because it is the same `single-authority`
 * shape, with two guards no other night action has:
 *
 * - **Never on night 1.** The inverse of the mafia, whose kill IS live on night
 *   one in this variant.
 * - **Once per game.** Derived from the night rows, so a shot the Doctor saved
 *   still counts — the bullet left the gun.
 *
 * Both are enforced HERE, on the server. The UI hides the button, but the rule
 * is a rule regardless of what the client believes.
 */
export const selectSerialKillerTarget = mutation({
  args: {
    gameId: v.id("games"),
    targetSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, targetSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const authority = await getSerialKillerAuthority(ctx.db, gameId);
    if (!authority || authority.playerId !== userId) {
      throw new ConvexError("You don't have authority to kill");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== GamePhase.SERIAL_KILLER_CHOOSES_TARGET) {
      throw new ConvexError("Not in serial killer target phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");
    if (nightNumber === 1) {
      throw new ConvexError("The serial killer cannot kill on the first night");
    }

    if (await isSerialKillerShotSpent(ctx.db, gameId)) {
      throw new ConvexError("Your one kill has already been used this game");
    }

    await verifyTargetAlive(ctx.db, gameId, targetSeatNumber);

    let nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) {
      const id = await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber,
      });
      nightSession = (await ctx.db.get(id))!;
    }

    if (nightSession.serialKillerTarget !== undefined) {
      throw new ConvexError("Target already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, {
      serialKillerTarget: targetSeatNumber,
    });
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
      throw new ConvexError("You don't have authority to heal");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== GamePhase.DOCTOR_HEALS_PLAYER) {
      throw new ConvexError("Not in doctor heal phase");
    }

    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

    await verifyTargetAlive(ctx.db, gameId, targetSeatNumber);

    const healedPlayers = await getAllHealedSeats(ctx.db, gameId);
    if (healedPlayers.includes(targetSeatNumber)) {
      throw new ConvexError("This player has already been healed once this game");
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
      throw new ConvexError("Heal already selected - cannot change decision");
    }

    await ctx.db.patch(nightSession._id, { healedPlayer: targetSeatNumber });
  },
});
