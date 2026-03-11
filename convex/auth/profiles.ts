import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUserId } from "../lib/auth";
import { getNicknameOwner, getProfileByUserId } from "../lib/profiles";

export const currentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await getProfileByUserId(ctx.db, userId);
  },
});

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getProfileByUserId(ctx.db, args.userId);
  },
});

export const isNicknameTaken = query({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const existing = await getNicknameOwner(ctx.db, args.nickname);
    return existing !== null;
  },
});

export const createProfile = mutation({
  args: {
    nickname: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const existingProfile = await getProfileByUserId(ctx.db, userId);
    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    const nicknameOwner = await getNicknameOwner(ctx.db, args.nickname);
    if (nicknameOwner) {
      throw new Error("Nickname is already taken");
    }

    const user = await ctx.db.get(userId);
    if (!user?.email) {
      throw new Error("User email not found");
    }

    return await ctx.db.insert("profiles", {
      userId,
      email: user.email,
      nickname: args.nickname,
    });
  },
});

export const updateNickname = mutation({
  args: {
    nickname: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const profile = await getProfileByUserId(ctx.db, userId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const nicknameOwner = await getNicknameOwner(ctx.db, args.nickname);
    if (nicknameOwner && nicknameOwner._id !== profile._id) {
      throw new Error("Nickname is already taken");
    }

    await ctx.db.patch(profile._id, { nickname: args.nickname });
  },
});
