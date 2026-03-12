import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import {
  assertIsHost,
  getPlayerInGame,
  getJoinRequestByRequester,
} from "../lib/games";

export const transfer = mutation({
  args: {
    gameId: v.id("games"),
    newHostId: v.id("profiles"),
  },
  handler: async (ctx, { gameId, newHostId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    if (newHostId === userId) {
      throw new Error("You are already the host");
    }

    const newHostProfile = await ctx.db.get(newHostId);
    if (!newHostProfile) {
      throw new Error("New host user not found");
    }

    const previousHostId = game.hostId;
    const hostSeatNumber = game.maxPlayers + 1;

    await ctx.db.patch(gameId, { hostId: newHostId });

    const newHostPlayer = await getPlayerInGame(ctx.db, gameId, newHostId);
    const prevHostPlayer = await getPlayerInGame(ctx.db, gameId, previousHostId);

    if (newHostPlayer && prevHostPlayer) {
      const newHostOriginalSeat = newHostPlayer.seatNumber;
      await ctx.db.patch(newHostPlayer._id, { seatNumber: hostSeatNumber });
      await ctx.db.patch(prevHostPlayer._id, { seatNumber: newHostOriginalSeat });
    } else if (newHostPlayer) {
      await ctx.db.patch(newHostPlayer._id, { seatNumber: hostSeatNumber });
    }

    const newHostRequest = await getJoinRequestByRequester(ctx.db, gameId, newHostId);
    if (newHostRequest) {
      await ctx.db.delete(newHostRequest._id);
    }

    const prevHostProfile = await ctx.db.get(previousHostId);
    if (!prevHostProfile) {
      throw new Error("Previous host profile not found");
    }

    const existingPrevHostRequest = await getJoinRequestByRequester(
      ctx.db,
      gameId,
      previousHostId,
    );

    if (existingPrevHostRequest) {
      await ctx.db.patch(existingPrevHostRequest._id, {
        status: "accepted",
        requesterNickname: prevHostProfile.nickname,
      });
    } else {
      await ctx.db.insert("joinRequests", {
        gameId,
        requesterId: previousHostId,
        requesterNickname: prevHostProfile.nickname,
        status: "accepted",
      });
    }
  },
});
