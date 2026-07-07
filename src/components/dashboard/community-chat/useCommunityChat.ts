"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { roleHasPermission, PERMISSIONS } from "@convex/lib/access";
import { toast } from "@/lib/utils/toast";
import { useErrorMessage } from "@/lib/i18n/errorMessage";

/**
 * Live community-chat data + actions. Wraps the reactive `useQuery`
 * subscriptions and the send/remove mutations (with toast-on-error) so the
 * view components stay purely presentational.
 *
 * `active` gates the heavy `list`/`online` subscriptions: the floating widget
 * passes `false` while collapsed so closed pages only hold the lightweight
 * unread-count subscription, not the full message feed.
 */
export function useCommunityChat({ active = true }: { active?: boolean } = {}) {
  const getErrorMessage = useErrorMessage();

  const profile = useQuery(api.auth.profiles.currentProfile);
  const messages = useQuery(
    api.community.messages.list,
    active ? {} : "skip",
  );
  const online = useQuery(
    api.community.messages.onlineInCommunity,
    active ? {} : "skip",
  );
  const sendMutation = useMutation(api.community.messages.send);
  const removeMutation = useMutation(api.community.messages.remove);

  const myId = profile?._id;
  const canModerate = roleHasPermission(
    profile?.role,
    PERMISSIONS.CHAT_MESSAGE_DELETE,
  );

  /** Returns true on success; on failure shows a toast and returns false. */
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await sendMutation({ text });
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err));
        return false;
      }
    },
    [sendMutation, getErrorMessage],
  );

  const remove = useCallback(
    async (messageId: Id<"communityMessages">) => {
      try {
        await removeMutation({ messageId });
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [removeMutation, getErrorMessage],
  );

  return { messages, online, myId, canModerate, send, remove };
}
