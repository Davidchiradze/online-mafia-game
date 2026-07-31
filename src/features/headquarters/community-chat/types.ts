import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";

/** A single rendered chat message (as returned by `community.messages.list`). */
export type ChatMessage = FunctionReturnType<
  typeof api.community.messages.list
>[number];

/** An online user shown in the sidebar (`community.messages.onlineInCommunity`). */
export type OnlineUser = FunctionReturnType<
  typeof api.community.messages.onlineInCommunity
>["users"][number];
