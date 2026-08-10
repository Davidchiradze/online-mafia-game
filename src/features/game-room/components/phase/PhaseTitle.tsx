"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { GAME_PHASES, SPEAKING_STATE } from "@/shared/lib/constants/game";
import PickerIndicator from "@/features/game-room/components/card-picking/PickerIndicator";
import PhaseCountdown from "@/features/game-room/components/phase/PhaseCountdown";

type Translator = ReturnType<typeof useTranslations<"game">>;

/**
 * Phases whose label depends on the night number. Each entry swaps in an
 * alternate `phases.*` key when its predicate matches — e.g. on the first night
 * the Mafia don't kill, they only meet and plan.
 */
const NIGHT_DEPENDENT_PHASE_LABELS: ReadonlyArray<{
  phase: string;
  appliesOn: (night: number) => boolean;
  labelKey: string;
}> = [
  {
    phase: GAME_PHASES[9], // mafia_chooses_target
    appliesOn: (night) => night === 1,
    labelKey: "mafia_meets_first_night",
  },
];

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
): string {
  // Neutral sleep buffer: the host sees where the game is headed; players only
  // see the generic "asleep" label (never the next phase — that would leak).
  if (phase === GAME_PHASES[21] && isHost && nextPhase) {
    // The Doctor→wake exit stores "farewell_speech" as a resolve-marker; the
    // real destination (farewell vs day) isn't known yet, so show "Day".
    const nextKey = nextPhase === "farewell_speech" ? "day_phase" : nextPhase;
    const label = t.has(`phases.${nextKey}`) ? t(`phases.${nextKey}`) : nextKey;
    return t("phaseTitle.nextPhase", { label });
  }

  const night = nightNumber ?? 0;

  const override = NIGHT_DEPENDENT_PHASE_LABELS.find(
    (o) => o.phase === phase && o.appliesOn(night),
  );
  const key = `phases.${override?.labelKey ?? phase}`;
  const label = t.has(key) ? t(key) : phase;

  const nightPhases: string[] = [
    GAME_PHASES[8],
    GAME_PHASES[9],
    GAME_PHASES[10],
    GAME_PHASES[11],
    GAME_PHASES[12],
    GAME_PHASES[13],
    GAME_PHASES[14],
  ];

  if (nightPhases.includes(phase) && night > 0) {
    return t("phaseTitle.nightLabel", { night, label });
  }

  const dayPhases: string[] = [
    GAME_PHASES[15],
    GAME_PHASES[16],
    GAME_PHASES[17],
    GAME_PHASES[18],
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
      gamePhase === GAME_PHASES[16] /* day_phase */ ||
      gamePhase === GAME_PHASES[7] /* introduction_phase */;
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
  );
  const speakerInfo = getSpeakerInfo(
    t,
    gamePhase,
    speakingOrder,
    currentSpeakerIndex,
  );
  const isPickingRolesPhase = gamePhase === GAME_PHASES[1];

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
