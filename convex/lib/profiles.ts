import { DatabaseReader } from "../_generated/server";

export async function getNicknameOwner(db: DatabaseReader, nickname: string) {
  return await db
    .query("profiles")
    .withIndex("by_nickname", (q) => q.eq("nickname", nickname))
    .unique();
}

export async function getProfileByAccountId(
  db: DatabaseReader,
  accountId: string,
) {
  return await db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .unique();
}
