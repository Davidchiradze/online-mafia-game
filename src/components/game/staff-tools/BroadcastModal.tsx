"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { Send, X } from "lucide-react";
import { gameBroadcasts } from "@convex/refs/game";
import { GAME_BROADCAST } from "@convex/lib/constants";
import type { Id } from "@convex/_generated/dataModel";
import { useErrorMessage } from "@/lib/i18n/errorMessage";
import { toast } from "@/lib/utils/toast";

/**
 * Compose + send a broadcast to everyone in the room. Staff-only; the `send`
 * mutation re-checks the permission server-side. On success shows a confirmation
 * toast and closes; on failure surfaces the translated error and stays open.
 */
export default function BroadcastModal({
  gameId,
  onClose,
}: {
  gameId: Id<"games">;
  onClose: () => void;
}) {
  const t = useTranslations("game.staffTools");
  const getErrorMessage = useErrorMessage();
  const send = useMutation(gameBroadcasts.send);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await send({ gameId, text: trimmed });
      toast.success(t("broadcastSent"));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-sans text-sm font-semibold text-white">
            {t("broadcastTitle")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="cursor-pointer rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={GAME_BROADCAST.MAX_MESSAGE_LENGTH}
          rows={4}
          placeholder={t("broadcastPlaceholder")}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 font-sans text-sm text-white placeholder:text-zinc-500 focus:border-white/25 focus:outline-none"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend();
          }}
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="font-sans text-xs text-zinc-500">
            {trimmed.length}/{GAME_BROADCAST.MAX_MESSAGE_LENGTH}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-3 py-2 font-sans text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? t("sending") : t("send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
