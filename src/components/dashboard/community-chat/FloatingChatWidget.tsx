"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, ChevronDown, Maximize2, Minimize2, X, Circle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { FEATURES } from "@convex/lib/entitlements";
import { useEntitlements } from "@/hooks/auth/useEntitlements";
import { cn } from "@/lib/utils";
import { useCommunityChat } from "./useCommunityChat";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { OnlinePanel } from "./OnlinePanel";

const OPEN_KEY = "communityChat.widget.open";
const EXPANDED_KEY = "communityChat.widget.expanded";

/** Reads a boolean from localStorage (SSR-safe — defaults until client). */
function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

/**
 * Floating community-chat widget — the always-on entry point to the global
 * channel (replaces the old `/community-chat` page). Subscription-gated: nothing
 * renders for non-subscribers, so the gated `unreadCount`/`list` queries are
 * only ever called by `WidgetInner` once access is confirmed.
 */
export default function FloatingChatWidget() {
  const { isLoading, has } = useEntitlements();
  if (isLoading || !has(FEATURES.COMMUNITY_CHAT)) return null;
  return <WidgetInner />;
}

function WidgetInner() {
  const t = useTranslations("communityChat");
  const [open, setOpen] = useState(() => readBool(OPEN_KEY));
  const [expanded, setExpanded] = useState(() => readBool(EXPANDED_KEY));
  // Online list shown in place of the message feed (the only way to reach it on
  // mobile / in the compact panel, where the side online panel is hidden).
  const [showOnline, setShowOnline] = useState(false);

  const unread = useQuery(api.community.readState.unreadCount) ?? 0;
  const markRead = useMutation(api.community.readState.markRead);

  const { messages, online, myId, canModerate, send, remove } =
    useCommunityChat({ active: open });

  const onlineCount = online?.count ?? 0;
  const onlineIds = useMemo(
    () => new Set(online?.users?.map((u) => u.profileId) ?? []),
    [online?.users],
  );

  // Persist widget state so it survives navigation / reload.
  useEffect(() => {
    window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);
  useEffect(() => {
    window.localStorage.setItem(EXPANDED_KEY, expanded ? "1" : "0");
  }, [expanded]);

  // While open, keep the channel marked read (clears the badge on open and as
  // new messages arrive). `messages` is only subscribed while open.
  useEffect(() => {
    if (open) void markRead();
  }, [open, messages?.length, markRead]);

  const badge = unread > 0 && !open ? (unread >= 99 ? "99+" : unread) : null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] font-inter",
              "h-[min(75vh,520px)] w-[calc(100vw-3rem)] sm:w-[380px]",
              expanded && "sm:h-[min(80vh,640px)] sm:w-[min(90vw,820px)]",
            )}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-3">
              <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
              <span
                className="uppercase tracking-[0.15em] text-white"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem", fontWeight: 700 }}
              >
                {t("globalChatTitle")}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {/* Online members — hidden only when the side panel already
                    shows them (desktop + expanded). */}
                <button
                  type="button"
                  onClick={() => setShowOnline((v) => !v)}
                  aria-label={t("onlineCount", { count: onlineCount })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
                    showOnline && "bg-white/10 text-white",
                    expanded && "sm:hidden",
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium tabular-nums">{onlineCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? t("shrinkPanel") : t("expandPanel")}
                  className="hidden rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:block"
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("closeChat")}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                {showOnline ? (
                  <OnlinePanel
                    users={online?.users}
                    count={onlineCount}
                    myId={myId}
                    onClose={() => setShowOnline(false)}
                  />
                ) : (
                  <>
                    <MessageList
                      messages={messages}
                      myId={myId}
                      canModerate={canModerate}
                      onlineIds={onlineIds}
                      onRemove={remove}
                    />
                    <Composer onSend={send} />
                  </>
                )}
              </div>

              {expanded && !showOnline && (
                <aside className="hidden w-64 shrink-0 flex-col border-l border-white/5 bg-black/20 sm:flex">
                  <OnlinePanel users={online?.users} count={onlineCount} myId={myId} />
                </aside>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("minimizeChat") : t("openChat")}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)] transition hover:bg-red-500"
      >
        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
        {badge !== null && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#0a0a12] bg-white px-1.5 text-xs font-bold tabular-nums text-red-600">
            {badge}
          </span>
        )}
      </button>
    </div>
  );
}
