import React from "react";
import {
  GAME_PHASES,
  GAME_PHASE_LABELS,
  SPEAKING_STATE,
} from "@/lib/constants/game";

type GameSessionState = {
  gamePhase: string;
  currentNightNumber?: number | null;
  speakingOrder?: number[];
  currentSpeakerIndex?: number | null;
  nominatedPlayers?: number[];
};

type PhaseTitleProps =
  | { gameSessionState: GameSessionState; title?: never; isHost?: boolean }
  | { title: string; gameSessionState?: never; isHost?: never };

function getPhaseTitle(
  phase: string,
  nightNumber: number | null | undefined,
): string {
  const label =
    GAME_PHASE_LABELS[phase as (typeof GAME_PHASES)[number]] ?? phase;
  const night = nightNumber ?? 0;

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
    return `N${night} — ${label}`;
  }

  const dayPhases: string[] = [
    GAME_PHASES[15],
    GAME_PHASES[16],
    GAME_PHASES[17],
    GAME_PHASES[18],
  ];

  if (dayPhases.includes(phase) && night > 0) {
    return `D${night} — ${label}`;
  }

  return label;
}

function getSpeakerInfo(
  speakingOrder: number[],
  currentSpeaker: number | null | undefined,
): { text: string; isActive: boolean } | null {
  if (!currentSpeaker || speakingOrder.length === 0) return null;

  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);
  const isActive = SPEAKING_STATE.isActive(currentSpeaker);
  const isCompleted = SPEAKING_STATE.isCompleted(currentSpeaker);

  if (isCompleted) return null;

  if (isActive) {
    return {
      text: `#${currentSpeaker} speaking`,
      isActive: true,
    };
  }

  if (isPaused) {
    const lastSpeaker = SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker);
    const lastIndex = speakingOrder.indexOf(lastSpeaker);

    if (lastIndex < speakingOrder.length - 1) {
      const nextSpeaker = speakingOrder[lastIndex + 1];
      return {
        text: `Next speaker: #${nextSpeaker}`,
        isActive: false,
      };
    }
  }

  return null;
}

export default function PhaseTitle(props: PhaseTitleProps) {
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
    currentNightNumber,
    speakingOrder = [],
    currentSpeakerIndex,
    nominatedPlayers = [],
  } = gameSessionState;

  const title = getPhaseTitle(gamePhase, currentNightNumber);
  const speakerInfo = getSpeakerInfo(speakingOrder, currentSpeakerIndex);

  // Only show nominated players to host
  const showNominated = isHost && nominatedPlayers.length > 0;

  return (
    <div className="text-center space-y-2">
      <h3 className="font-orbitron text-white uppercase tracking-wider text-sm font-bold">
        {title}
      </h3>

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
                Nominated: {nominatedPlayers.map((n) => `#${n}`).join(", ")}
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
