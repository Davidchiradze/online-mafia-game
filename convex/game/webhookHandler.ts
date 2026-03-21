import { v } from "convex/values";
import { action } from "../_generated/server";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

const leavePlayerInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games">; userId: Id<"profiles"> },
  null
>("game/players:leaveAdminInternal");

const leaveSpectatorInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games">; userId: Id<"profiles"> },
  null
>("game/spectators:leaveAdminInternal");

const removeGameInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games"> },
  null
>("lobby/games:removeInternal");

function isConvexId(id: string): boolean {
  return !id.includes("-");
}

export const handleParticipantLeft = action({
  args: {
    gameId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isConvexId(args.gameId) || !isConvexId(args.userId)) return null;

    const gameId = args.gameId as Id<"games">;
    const userId = args.userId as Id<"profiles">;

    try {
      await ctx.runMutation(leavePlayerInternal, { gameId, userId });
      console.log(`Player ${userId} disconnected from game ${gameId}`);
    } catch {
      try {
        await ctx.runMutation(leaveSpectatorInternal, { gameId, userId });
        console.log(`Spectator ${userId} disconnected from game ${gameId}`);
      } catch {
        // Not a player or spectator — ignore
      }
    }
  },
});

export const handleRoomFinished = action({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isConvexId(args.gameId)) return null;

    const gameId = args.gameId as Id<"games">;

    await ctx.runMutation(removeGameInternal, { gameId });
    console.log(`Game ${gameId} deleted after room finished`);
  },
});
