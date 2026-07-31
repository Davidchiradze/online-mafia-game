"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { COMMUNITY_CHAT } from "@convex/lib/constants";
import { cn } from "@/shared/lib/cn";

type Props = {
  /** Sends the message; returns false on failure so the draft can be restored. */
  onSend: (text: string) => Promise<boolean>;
};

export function Composer({ onSend }: Props) {
  const t = useTranslations("communityChat");
  const [draft, setDraft] = useState("");

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const ok = await onSend(text);
    if (!ok) setDraft(text); // restore so the user doesn't lose their message
  };

  return (
    <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/5 bg-black/30">
      <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-red-500/40 focus-within:shadow-[0_0_20px_rgba(220,38,38,0.15)] transition px-3 py-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          maxLength={COMMUNITY_CHAT.MAX_MESSAGE_LENGTH}
          placeholder={t("composerPlaceholder")}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none py-1.5"
        />
        <button
          onClick={() => void submit()}
          disabled={!draft.trim()}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition shrink-0",
            draft.trim()
              ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              : "bg-white/5 text-zinc-600 cursor-not-allowed",
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
