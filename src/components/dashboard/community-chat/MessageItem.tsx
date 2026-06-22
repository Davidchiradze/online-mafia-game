"use client";

import { Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import { StaffBadge } from "./StaffBadge";
import type { ChatMessage } from "./types";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  message: ChatMessage;
  self: boolean;
  canModerate: boolean;
  onRemove: (id: Id<"communityMessages">) => void;
};

export function MessageItem({ message, self, canModerate, onRemove }: Props) {
  const t = useTranslations("communityChat");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 group", self && "flex-row-reverse")}
    >
      <UserAvatar src={message.authorAvatar} name={message.authorNickname} size={40} />
      <div className={cn("flex flex-col gap-1 max-w-[78%] sm:max-w-[65%]", self && "items-end")}>
        <div className={cn("flex items-baseline gap-2", self && "flex-row-reverse")}>
          <span className={cn("text-sm font-semibold", self ? "text-white" : "text-zinc-200")}>
            {self ? t("selfLabel") : message.authorNickname}
          </span>
          {!self && <StaffBadge role={message.authorRole} />}
          <span className="text-[11px] text-zinc-500">{formatTime(message.createdAt)}</span>
        </div>
        <div className={cn("flex items-center gap-2", self && "flex-row-reverse")}>
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm leading-relaxed border backdrop-blur-md",
              message.deleted
                ? "bg-white/5 border-white/10 text-zinc-500 italic"
                : self
                  ? "bg-red-600/15 border-red-500/30 text-zinc-100 rounded-tr-sm"
                  : "bg-white/5 border-white/10 text-zinc-200 rounded-tl-sm",
            )}
          >
            {message.deleted ? t("messageRemoved") : message.text}
          </div>
          {canModerate && !message.deleted && (
            <button
              onClick={() => onRemove(message._id)}
              title={t("deleteMessage")}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
