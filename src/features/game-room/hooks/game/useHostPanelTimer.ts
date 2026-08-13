"use client";

import { useTranslations } from "next-intl";
import { useCountdown } from "./useCountdown";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

/** Seconds left at which the pill turns urgent, unless a phase overrides it. */
const DEFAULT_URGENT_SECONDS = 10;

/**
 * The countdown pill in the panel's identity zone.
 *
 * Server-corrected via `useCountdown` / `useServerTime`, so it never subtracts
 * a server timestamp from a raw `Date.now()`. Returns `undefined` when there
 * is nothing to count — the descriptor field is optional, and the pill simply
 * does not render.
 *
 * Display only: the server owns expiry. This tells the host how long the
 * speaker has left, it does not end the speech.
 */
export function useHostPanelTimer(
  startedAt: string | null | undefined,
  durationMs: number,
  urgentSeconds: number = DEFAULT_URGENT_SECONDS,
): HostPanelDescriptor["timer"] {
  const t = useTranslations("game.host");
  const parsed = startedAt ? Date.parse(startedAt) : Number.NaN;
  const startMs = Number.isNaN(parsed) ? null : parsed;
  const { secondsLeft } = useCountdown(startMs, durationMs);

  if (startMs === null) return undefined;

  return {
    label: t("timerSeconds", { seconds: secondsLeft }),
    isUrgent: secondsLeft <= urgentSeconds,
  };
}
