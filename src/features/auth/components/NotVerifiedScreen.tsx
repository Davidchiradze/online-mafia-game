"use client";

import { motion } from "motion/react";
import { MailWarning, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { LOGOUT_ENDPOINT, PHP_API_BASE_URL } from "@/features/auth/lib/constants";

const BG_IMG = "https://www.mafia.ge/templates/newassets/img/mafiabg.jpg";

/**
 * Shown when an authenticated user's PHP account is not yet verified
 * (`status_id === 0`). Mirrors `AuthErrorScreen` but on the verification
 * axis: it points the user back to mafia.ge to verify, and offers a logout.
 */
export default function NotVerifiedScreen() {
  const t = useTranslations("notVerified");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a12] text-white">
      <div className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG_IMG}
          alt=""
          className="h-full w-full scale-110 object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#0a0a12]/70 to-[#0a0a12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/30 via-transparent to-purple-950/25" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.22) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(147,51,234,0.12) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0
                ? "h-1.5 w-1.5 bg-amber-500/30"
                : i % 3 === 1
                  ? "h-1 w-1 bg-purple-400/20"
                  : "h-0.5 w-0.5 bg-white/15"
            }`}
            style={{ left: `${6 + i * 9}%`, top: `${12 + ((i * 19) % 65)}%` }}
            animate={{
              y: [-25, 25, -25],
              x: [-8, 8, -8],
              opacity: [0.1, 0.45, 0.1],
            }}
            transition={{
              duration: 5 + (i % 4) * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/60 p-8 shadow-2xl sm:p-12"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-[2px] w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-70" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/20 blur-[100px]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/25 to-amber-900/40 shadow-[0_0_30px_rgba(245,158,11,0.35)]"
            >
              <MailWarning className="h-10 w-10 text-amber-400" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-widest text-amber-300">
                {t("badge")}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-4 font-orbitron text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"
            >
              <span className="bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
                {t("title")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mx-auto mb-9 max-w-md font-sans text-base leading-relaxed text-gray-400"
            >
              {t("body")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href={PHP_API_BASE_URL}
                className="group relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-7 py-3.5 font-sans text-base font-semibold text-white shadow-[0_0_30px_rgba(245,158,11,0.4)] transition hover:shadow-[0_0_45px_rgba(245,158,11,0.65)] sm:w-auto"
              >
                {t("verifyCta")}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href={LOGOUT_ENDPOINT}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 font-sans text-base font-semibold text-gray-300 transition hover:bg-white/10 sm:w-auto"
              >
                {t("logout")}
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
