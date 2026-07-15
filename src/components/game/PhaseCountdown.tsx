"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PHASE_TIMERS } from "@/lib/constants/game";
import { type GamePhase, type Role } from "@/lib/game/visibility";
import { useCountdown } from "@/hooks/game/useCountdown";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Per-phase decision countdown badge.
 *
 * Visual-only pressure cue for the acting role(s) of a night/decision phase
 * (e.g. mafia choosing a target, detective checking). The host always sees it;
 * spectators never do. When the timer hits 0 nothing auto-advances — the host
 * still ends the phase manually.
 *
 * Renders nothing unless the current phase has a configured timer in
 * `PHASE_TIMERS` and the viewer is allowed to see it.
 */
export default function PhaseCountdown() {
  const t = useTranslations("game.phaseTimer");
  const { gameSessionState, viewerRole, isHost, isSpectator, ruleset } =
    useGameRoom();

  const phase = gameSessionState?.gamePhase as GamePhase | undefined;
  const durationMs = phase ? PHASE_TIMERS[phase] : undefined;

  // Gate: acting role(s) for this phase, or the host. Never spectators.
  const isActingRole =
    !isSpectator &&
    !!phase &&
    !!viewerRole &&
    ruleset.visibility.getAwakeRoles(phase).includes(viewerRole as Role);
  const canSee = isHost || isActingRole;

  const { secondsLeft, isExpired } = useCountdown(
    canSee && durationMs ? gameSessionState?.phaseStartedAt : null,
    durationMs ?? 0,
  );

  if (!canSee || !durationMs || gameSessionState?.phaseStartedAt == null) {
    return null;
  }

  const isUrgent = secondsLeft <= 5;

  return (
    <div
      className={`badge ${
        isExpired || isUrgent ? "badge-timer-urgent" : "badge-timer"
      }`}
      role="timer"
      aria-live="off"
    >
      <svg
        className="w-2.5 h-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
      <span className="tabular-nums">
        {t("seconds", { seconds: isExpired ? 0 : secondsLeft })}
      </span>
    </div>
  );
}
