"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SPEAKING_STATE, GamePhase } from "@/shared/lib/constants/game";
import PickerIndicator from "@/features/game-room/components/card-picking/PickerIndicator";
import PhaseCountdown from "@/features/game-room/components/phase/PhaseCountdown";
import { useGameFlags } from "@/features/game-room/hooks/game/useGameFlags";
import { nightPhaseLabelKey } from "@/features/game-room/lib/nightPhase";

type Translator = ReturnType<typeof useTranslations<"game">>;

type GameSessionState = {
  gamePhase: string;
  nextPhase?: string;
  currentNightNumber?: number | null;
  speakingOrder?: number[];
  currentSpeakerIndex?: number | null;
  nominatedPlayers?: number[];
};

type PhaseTitleProps =
  | { gameSessionState: GameSessionState; title?: never; isHost?: boolean }
  | { title: string; gameSessionState?: never; isHost?: never };

function getPhaseTitle(
  t: Translator,
  phase: string,
  nightNumber: number | null | undefined,
  isHost: boolean,
  nextPhase: string | undefined,
  mafiaKillsOnFirstNight: boolean,
): string {
  // Neutral sleep buffer: the host sees where the game is headed; players only
  // see the generic "asleep" label (never the next phase — that would leak).
  if (phase === GamePhase.PHASE_TRANSITION && isHost && nextPhase) {
    // The Doctor→wake exit stores "farewell_speech" as a resolve-marker; the
    // real destination (farewell vs day) isn't known yet, so show "Day".
    const nextKey = nextPhase === GamePhase.FAREWELL_SPEECH ? GamePhase.DAY_PHASE : nextPhase;
    const label = t.has(`phases.${nextKey}`) ? t(`phases.${nextKey}`) : nextKey;
    return t("phaseTitle.nextPhase", { label });
  }

  const night = nightNumber ?? 0;

  // Shared with the host panel and the player title — this used to be a private
  // second copy of the same rule, which is how it stayed Japanese-only.
  const key = `phases.${nightPhaseLabelKey(phase, night, mafiaKillsOnFirstNight)}`;
  const label = t.has(key) ? t(key) : phase;

  const nightPhases: string[] = [
    GamePhase.NIGHT_PHASE,
    GamePhase.MAFIA_CHOOSES_TARGET,
    GamePhase.DON_CHECKS_FOR_DETECTIVE,
    GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
    GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
    GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
    GamePhase.DOCTOR_HEALS_PLAYER,
  ];

  if (nightPhases.includes(phase) && night > 0) {
    return t("phaseTitle.nightLabel", { night, label });
  }

  const dayPhases: string[] = [
    GamePhase.FAREWELL_SPEECH,
    GamePhase.DAY_PHASE,
    GamePhase.NOMINATED_PLAYERS_SPEAK,
    GamePhase.VOTING,
  ];

  if (dayPhases.includes(phase) && night > 0) {
    return t("phaseTitle.dayLabel", { night, label });
  }

  return label;
}

function getSpeakerInfo(
  t: Translator,
  gamePhase: string,
  speakingOrder: number[],
  currentSpeaker: number | null | undefined,
): { text: string; isActive: boolean } | null {
  if (speakingOrder.length === 0) return null;

  // Opener preview: the day/introduction entry precomputes the order but leaves
  // `currentSpeakerIndex` unset until the host clicks Start. Show who opens.
  if (currentSpeaker == null) {
    const isSpeakingEntry =
      gamePhase === GamePhase.DAY_PHASE || gamePhase === GamePhase.INTRODUCTION_PHASE;
    if (isSpeakingEntry) {
      return {
        text: t("phaseTitle.opensNext", { seat: speakingOrder[0] }),
        isActive: false,
      };
    }
    return null;
  }

  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);
  const isActive = SPEAKING_STATE.isActive(currentSpeaker);
  const isCompleted = SPEAKING_STATE.isCompleted(currentSpeaker);

  if (isCompleted) return null;

  if (isActive) {
    return {
      text: t("phaseTitle.speaking", { seat: currentSpeaker }),
      isActive: true,
    };
  }

  if (isPaused) {
    const lastSpeaker = SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker);
    const lastIndex = speakingOrder.indexOf(lastSpeaker);

    if (lastIndex < speakingOrder.length - 1) {
      const nextSpeaker = speakingOrder[lastIndex + 1];
      return {
        text: t("phaseTitle.nextSpeaker", { seat: nextSpeaker }),
        isActive: false,
      };
    }
  }

  return null;
}

export default function PhaseTitle(props: PhaseTitleProps) {
  const t = useTranslations("game");
  // Before the early return below — the `title` branch renders no phase label,
  // but a hook may not be called conditionally.
  const { mafiaKillsOnFirstNight } = useGameFlags();

  if ("title" in props && props.title) {
    return (
      <div className="text-center">
        <h3 className="font-orbitron text-white uppercase tracking-wider text-sm font-bold">
          {props.title}
        </h3>
      </div>
    );
  }

  const gameSessionState = props.gameSessionState;
  const isHost = props.isHost ?? false;
  if (!gameSessionState) return null;

  const {
    gamePhase,
    nextPhase,
    currentNightNumber,
    speakingOrder = [],
    currentSpeakerIndex,
    nominatedPlayers = [],
  } = gameSessionState;

  const title = getPhaseTitle(
    t,
    gamePhase,
    currentNightNumber,
    isHost,
    nextPhase,
    mafiaKillsOnFirstNight,
  );
  const speakerInfo = getSpeakerInfo(
    t,
    gamePhase,
    speakingOrder,
    currentSpeakerIndex,
  );
  const isPickingRolesPhase = gamePhase === GamePhase.PICKING_ROLES;

  // Only show nominated players to host
  const showNominated = isHost && nominatedPlayers.length > 0;

  return (
    <div className="text-center space-y-2">
      <h3 className="font-orbitron text-white uppercase tracking-wider text-sm font-bold">
        {title}
      </h3>

      <PhaseCountdown />

      {isPickingRolesPhase && <PickerIndicator />}

      {(speakerInfo || showNominated) && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {showNominated && (
            <div className="badge badge-nominated">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {t("phaseTitle.nominated", {
                  list: nominatedPlayers.map((n) => `#${n}`).join(", "),
                })}
              </span>
            </div>
          )}

          {speakerInfo && (
            <div
              className={`badge ${speakerInfo.isActive ? "badge-speaker-active" : "badge-speaker-paused"}`}
            >
              {speakerInfo.isActive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              )}
              <span>{speakerInfo.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
