"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Crown, ChevronRight, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useEntitlements } from "@/hooks/auth/useEntitlements";
import { SUBSCRIPTIONS_PATH } from "@/components/auth/SubscriptionGuard";

const SESSION_KEY = "lobby_upsell_seen";
const SHOW_DELAY_MS = 800;

/**
 * One-shot upsell banner shown to non-subscribers when they land in the lobby.
 * Self-gating: renders nothing for subscribers/staff or once dismissed this
 * session (tracked in `sessionStorage`). Sibling of the inline `SubscriptionUpsell`
 * controls — this is the proactive, attention-grabbing nudge. Mirrors the
 * `AuthErrorScreen` visual language (glass card, glow, gradient headline).
 */
export function LobbySubscriptionModal() {
  const t = useTranslations("subscriptions.upsellModal");
  const { isLoading, isSubscribed } = useEntitlements();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || isSubscribed) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading, isSubscribed]);

  const markSeen = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={markSeen} showClose={false} size="lg">
      {/* Edge-to-edge hero: negative margins cancel Modal's padding so the glass
          card bleeds to the rounded corners. `-mt-12` also covers the empty
          title/close row + `mt-6` content offset the Modal always renders. */}
      <div className="relative -mx-6 -mb-6 -mt-12 overflow-hidden rounded-2xl border border-white/5 bg-black/70 p-8 sm:p-10">
        {/* Top accent line + ambient glow, matching AuthErrorScreen */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[2px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/20 blur-[100px]" />

        <button
          onClick={markSeen}
          aria-label="close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/25 to-red-900/40 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
          >
            <Crown className="h-9 w-9 text-amber-300" />
          </motion.div>

          {/* <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 backdrop-blur-sm"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-amber-300">
              {t("badge")}
            </span>
          </motion.div> */}

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-4 font-orbitron text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
          >
            <span className="bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              {t("title")}
            </span>
            <br />
            <span className="bg-gradient-to-r from-red-500 via-red-400 to-amber-400 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mb-8 max-w-md font-sans text-sm leading-relaxed text-gray-400 sm:text-base"
          >
            {t("body")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex w-full flex-col items-center gap-3"
          >
            <Link
              href={SUBSCRIPTIONS_PATH}
              onClick={markSeen}
              className="group relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 px-7 py-3.5 font-sans text-base font-semibold text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition hover:shadow-[0_0_45px_rgba(220,38,38,0.65)] sm:w-auto"
            >
              {t("cta")}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <button
              onClick={markSeen}
              className="cursor-pointer font-sans text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              {t("dismiss")}
            </button>
          </motion.div>
        </div>
      </div>
    </Modal>
  );
}
