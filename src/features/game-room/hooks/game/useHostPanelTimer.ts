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
  /**
   * Speaker/window starts are server-issued ISO strings; phase starts are ms
   * epoch numbers on the session. Both arrive here rather than making every
   * caller remember which shape its phase uses.
   */
  startedAt: string | number | null | undefined,
  durationMs: number | null | undefined,
  urgentSeconds: number = DEFAULT_URGENT_SECONDS,
): HostPanelDescriptor["timer"] {
  const t = useTranslations("game.host");
  const parsed =
    typeof startedAt === "number"
      ? startedAt
      : startedAt
        ? Date.parse(startedAt)
        : Number.NaN;
  const startMs = Number.isNaN(parsed) ? null : parsed;
  const { secondsLeft } = useCountdown(startMs, durationMs ?? 0);

  if (startMs === null || !durationMs) return undefined;

  return {
    label: t("timerSeconds", { seconds: secondsLeft }),
    isUrgent: secondsLeft <= urgentSeconds,
  };
}
