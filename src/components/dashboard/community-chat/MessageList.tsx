"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import type { Id } from "@convex/_generated/dataModel";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MessageItem } from "./MessageItem";
import type { ChatMessage } from "./types";

type Props = {
  /** `undefined` while loading. */
  messages: ChatMessage[] | undefined;
  myId: Id<"profiles"> | undefined;
  canModerate: boolean;
  onRemove: (id: Id<"communityMessages">) => void;
};

export function MessageList({ messages, myId, canModerate, onRemove }: Props) {
  const t = useTranslations("communityChat");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message. (A DOM side effect, not a data
  // subscription — the live data comes from `useCommunityChat`.)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6 flex flex-col gap-5"
    >
      {messages === undefined ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          {t("emptyChannel")}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageItem
              key={msg._id}
              message={msg}
              self={msg.authorId === myId}
              canModerate={canModerate}
              onRemove={onRemove}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
