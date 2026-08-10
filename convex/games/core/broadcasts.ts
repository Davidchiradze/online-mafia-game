import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { getAuthenticatedProfile, requirePermission } from "../../lib/auth";
import { PERMISSIONS, normalizeRole } from "../../lib/access";
import { writeAudit } from "../../lib/admin";
import { GAME_BROADCAST } from "../../lib/constants";

/**
 * Room-wide notification channel for a single game. Delivered to every client
 * in the room (players + spectators) as a one-shot toast via the reactive
 * `recent` query (see src/hooks/game/useGameBroadcasts.ts).
 *
 * Two producers share `insertBroadcast`:
 *   - `send`  — client-facing, staff-only (permission-gated), attaches sender.
 *   - `push`  — internal, for system/automated notifications (news, events);
 *               no auth and no sender. Call via `internal.game.broadcasts.push`
 *               from other Convex functions / crons / `ctx.scheduler`.
 */

type BroadcastKind = "staff" | "system" | "news";

const kindValidator = v.union(
  v.literal("staff"),
  v.literal("system"),
  v.literal("news"),
);

/**
 * Validate + insert a room broadcast. Single source of truth for game existence
 * and text rules, shared by both the staff and system producers. Pass `sender`
 * for attributed messages; omit it for anonymous system pushes.
 */
async function insertBroadcast(
  ctx: MutationCtx,
  args: {
    gameId: Id<"games">;
    kind: BroadcastKind;
    text: string;
    title?: string;
    sender?: Doc<"profiles">;
  },
): Promise<void> {
  const { gameId, kind, title, sender } = args;

  const game = await ctx.db.get(gameId);
  if (!game) {
    throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game not found." });
  }

  const text = args.text.trim();
  if (text.length === 0) {
    throw new ConvexError({
      code: "BROADCAST_EMPTY",
      message: "Message cannot be empty.",
    });
  }
  if (text.length > GAME_BROADCAST.MAX_MESSAGE_LENGTH) {
    throw new ConvexError({
      code: "BROADCAST_TOO_LONG",
      message: `Message must be ${GAME_BROADCAST.MAX_MESSAGE_LENGTH} characters or fewer.`,
    });
  }

  await ctx.db.insert("gameBroadcasts", {
    gameId,
    kind,
    text,
    title: title?.trim() || undefined,
    senderId: sender?._id,
    senderNickname: sender?.nickname,
    senderRole: sender ? normalizeRole(sender.role) : undefined,
    createdAt: Date.now(),
  });
}

/**
 * Staff sends a message to everyone in a game room. Gated by
 * `GAME_BROADCAST` (moderators + admins). Recorded in the admin audit log.
 */
export const send = mutation({
  args: { gameId: v.id("games"), text: v.string() },
  handler: async (ctx, { gameId, text }) => {
    const staff = await requirePermission(ctx, PERMISSIONS.GAME_BROADCAST);
    await insertBroadcast(ctx, { gameId, kind: "staff", text, sender: staff });
    await writeAudit(ctx, staff._id, "game.broadcast", gameId, { text });
  },
});

/**
 * Internal producer for system/automated notifications (news, game events).
 * No auth and no sender — invoke via `internal.game.broadcasts.push` from a
 * Convex function, cron, or scheduled job.
 */
export const push = internalMutation({
  args: {
    gameId: v.id("games"),
    kind: kindValidator,
    text: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { gameId, kind, text, title }) => {
    await insertBroadcast(ctx, { gameId, kind, text, title });
  },
});

/**
 * Recent broadcasts for a game, newest-first. Available to any authenticated
 * user (all lobby members receive room notifications regardless of tier).
 * Bounded to a short freshness window so a just-joined client isn't toasted
 * with stale announcements and the subscription stays cheap.
 */
export const recent = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    await getAuthenticatedProfile(ctx);

    const cutoff = Date.now() - GAME_BROADCAST.RECENT_WINDOW_MS;
    const rows = await ctx.db
      .query("gameBroadcasts")
      .withIndex("by_gameId", (q) =>
        q.eq("gameId", gameId).gt("createdAt", cutoff),
      )
      .order("desc")
      .take(GAME_BROADCAST.LIST_LIMIT);

    return rows.map((r) => ({
      _id: r._id,
      kind: r.kind,
      text: r.text,
      title: r.title,
      senderNickname: r.senderNickname,
      senderRole: r.senderRole,
      createdAt: r.createdAt,
    }));
  },
});
