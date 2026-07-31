"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PHASE_TIMERS, SPORTS } from "@/shared/lib/constants/game";
import { type GamePhase, type Role } from "@/shared/lib/game/visibility";
import { useCountdown } from "@/hooks/game/useCountdown";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type TimerSource = { durationMs: number; startMs: number };

/**
 * Resolves the countdown source for the current phase, or null when no timer
 * should run right now.
 *
 *  - Sports `unanimous-vote` mafia (§5.3): the `mafia_chooses_target` phase does
 *    NOT use the generic phase timer. It counts the 5s host-opened kill window
 *    from `mafiaTargetWindowStartedAt`, and only while the window is active —
 *    so no badge shows before the host opens it or after it closes.
 *  - Every other phase: the generic `PHASE_TIMERS[phase]` counted from
 *    `phaseStartedAt`.
 */
function usePhaseTimerSource(): TimerSource | null {
  const { gameSessionState, nightPhaseSession, ruleset } = useGameRoom();
  const phase = gameSessionState?.gamePhase as GamePhase | undefined;
  if (!phase) return null;

  if (
    ruleset.mafiaNightModel === "unanimous-vote" &&
    phase === "mafia_chooses_target"
  ) {
    const startedAt = nightPhaseSession?.mafiaTargetWindowStartedAt;
    if (nightPhaseSession?.mafiaTargetWindowActive !== true || !startedAt) {
      return null;
    }
    return {
      durationMs: SPORTS.MAFIA_TARGET_WINDOW_MS,
      startMs: Date.parse(startedAt),
    };
  }

  const durationMs = PHASE_TIMERS[phase];
  const startMs = gameSessionState?.phaseStartedAt;
  if (durationMs == null || startMs == null) return null;
  return { durationMs, startMs };
}

/** Acting role(s) for the current phase, or the host. Never spectators. */
function useCanSeeTimer(): boolean {
  const { gameSessionState, viewerRole, isHost, isSpectator, ruleset } =
    useGameRoom();
  const phase = gameSessionState?.gamePhase as GamePhase | undefined;
  if (isSpectator || !phase) return false;
  if (isHost) return true;
  return (
    !!viewerRole &&
    ruleset.visibility.getAwakeRoles(phase).includes(viewerRole as Role)
  );
}

/**
 * Per-phase decision countdown badge.
 *
 * Visual-only pressure cue for the acting role(s) of a night/decision phase
 * (e.g. mafia choosing a target, detective checking). The host always sees it;
 * spectators never do. When the timer hits 0 nothing auto-advances — the host
 * still ends the phase manually.
 */
export default function PhaseCountdown() {
  const t = useTranslations("game.phaseTimer");
  const canSee = useCanSeeTimer();
  const timer = usePhaseTimerSource();

  // `useCountdown` must run every render — pass null to disable it when there
  // is no timer or the viewer may not see it.
  const { secondsLeft, isExpired } = useCountdown(
    canSee && timer ? timer.startMs : null,
    timer?.durationMs ?? 0,
  );

  if (!canSee || !timer) return null;

  const seconds = isExpired ? 0 : secondsLeft;
  return (
    <TimerBadge seconds={seconds} urgent={isExpired || secondsLeft <= 5} t={t} />
  );
}

function TimerBadge({
  seconds,
  urgent,
  t,
}: {
  seconds: number;
  urgent: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      className={`badge ${urgent ? "badge-timer-urgent" : "badge-timer"}`}
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
      <span className="tabular-nums">{t("seconds", { seconds })}</span>
    </div>
  );
}
