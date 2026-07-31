"use client";

import { useTranslations } from "next-intl";

/**
 * Win-streak badge shown beside the lobby title. Renders nothing unless the
 * player is on a streak of 2+ consecutive wins. A compact gradient pill —
 * deliberately distinct from the lobby stat cards. Pure CSS — no animation
 * library, no backdrop-blur — so it stays cheap on low-end devices.
 */

function tierFor(streak: number) {
  if (streak >= 7) {
    return {
      from: "rgba(217,70,239,0.30)",
      to: "rgba(168,85,247,0.30)",
      border: "border-fuchsia-400/40",
      glow: "rgba(168,85,247,0.35)",
      text: "text-fuchsia-100",
    };
  }
  if (streak >= 4) {
    return {
      from: "rgba(249,115,22,0.32)",
      to: "rgba(244,63,94,0.28)",
      border: "border-orange-400/40",
      glow: "rgba(249,115,22,0.35)",
      text: "text-orange-100",
    };
  }
  return {
    from: "rgba(251,146,60,0.28)",
    to: "rgba(245,158,11,0.22)",
    border: "border-amber-400/35",
    glow: "rgba(251,146,60,0.3)",
    text: "text-amber-100",
  };
}

export default function StreakFlame({ streak }: { streak: number }) {
  const t = useTranslations("lobby");

  if (streak <= 1) return null;
  const tier = tierFor(streak);

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2 ${tier.border}`}
      style={{
        background: `linear-gradient(135deg, ${tier.from} 0%, ${tier.to} 100%)`,
        boxShadow: `0 0 22px ${tier.glow}`,
      }}
    >
      <span className="animate-pulse text-xl leading-none">🔥</span>
      <span
        className={`font-orbitron text-2xl font-extrabold leading-none ${tier.text}`}
      >
        {streak}
      </span>
      {/* <span className="font-sans text-[10px] font-bold uppercase leading-tight tracking-[0.15em] text-white/60">
        {t("streakLabel")}
      </span> */}
    </div>
  );
}
