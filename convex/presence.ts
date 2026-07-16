import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getAuthenticatedProfile, requirePermission } from "./lib/auth";
import { PERMISSIONS } from "./lib/access";
import { PRESENCE } from "./lib/constants";

export const presence = new Presence(components.presence);

/**
 * Keepalive heartbeat from the client `usePresence` hook.
 *
 * The client passes its own userId for local rendering, but we IGNORE it and
 * derive identity from the authenticated profile server-side — a client must
 * not be able to register presence as another user. Throws if unauthenticated
 * or if the profile hasn't synced yet, which simply means no presence row is
 * written for that session (correct: they aren't "really" on the site yet).
 */
export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, sessionId, interval }) => {
    const profile = await getAuthenticatedProfile(ctx);
    return await presence.heartbeat(
      ctx,
      roomId,
      profile._id,
      sessionId,
      interval,
    );
  },
});

/**
 * Live list of users in a room, keyed by the opaque roomToken from `heartbeat`.
 *
 * NOTE: no client currently subscribes to this. `PresenceBootstrap` heartbeats
 * write-only (it does not use `@convex-dev/presence`'s `usePresence`, which
 * would subscribe here on every page for every user — the source of the huge
 * `presence.list` call volume). The online panels read `listRoom` instead. Kept
 * for completeness / any future per-room list UI. If you DO subscribe to it,
 * keep it free of per-user reads so all subscriptions share one cache entry.
 */
export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    return await presence.list(ctx, roomToken);
  },
});

/**
 * Graceful disconnect, fired via `navigator.sendBeacon` on tab close.
 * Can't authenticate here (no JWT during page unload) — the sessionToken is
 * the unguessable capability that authorizes removing exactly that session.
 */
export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return await presence.disconnect(ctx, sessionToken);
  },
});

/**
 * Admin: how many users are on the site right now, plus their nicknames.
 * Reactive — re-runs as users come and go. Gated on USER_VIEW (admin panel).
 */
export const onlineNow = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.USER_VIEW);

    const online = await presence.listRoom(
      ctx,
      PRESENCE.GLOBAL_ROOM,
      true, // onlineOnly
      1000, // generous cap for the global room
    );

    const users = await Promise.all(
      online.map(async (entry) => {
        const profile = await ctx.db.get(entry.userId as Id<"profiles">);
        return {
          profileId: entry.userId,
          nickname: profile?.nickname ?? "Unknown",
          avatar: profile?.avatar,
        };
      }),
    );

    return { count: users.length, users };
  },
});
