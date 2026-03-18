import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getNicknameOwner(db: DatabaseReader, nickname: string) {
  return await db
    .query("profiles")
    .withIndex("by_nickname", (q) => q.eq("nickname", nickname))
    .unique();
}

export async function getProfileByUserId(db: DatabaseReader, userId: Id<"users">) {
  return await db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}
