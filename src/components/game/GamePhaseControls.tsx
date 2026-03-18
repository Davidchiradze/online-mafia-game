import React from "react";
import {
  GAME_PHASES,
  GAME_PHASE_LABELS,
  SPEAKING_STATE,
} from "@/lib/constants/game";
import StartGameButton from "../gameSession/phaseButtonsForHost/StartGameButton";
import StartPickingRolesButton from "../gameSession/phaseButtonsForHost/StartPickingRolesButton";
import ConfirmRolesButton from "../gameSession/phaseButtonsForHost/ConfirmRolesButton";
import EndMafiaMeetButton from "../gameSession/phaseButtonsForHost/EndMafiaMeetButton";
import EndDonChooseRightHandButton from "../gameSession/phaseButtonsForHost/EndDonChooseRightHandButton";
import EndYakuzaShogunMeetButton from "../gameSession/phaseButtonsForHost/EndYakuzaShogunMeetButton";
import EndDetectiveMeetButton from "../gameSession/phaseButtonsForHost/EndDetectiveMeetButton";
import EndDoctorMeetButton from "../gameSession/phaseButtonsForHost/EndDoctorMeetButton";
import StartNightPhaseButton from "../gameSession/phaseButtonsForHost/StartNightPhaseButton";
import StartMafiaTargetButton from "../gameSession/phaseButtonsForHost/StartMafiaTargetButton";
import EndMafiaTargetButton from "../gameSession/phaseButtonsForHost/EndMafiaTargetButton";
import EndDonCheckButton from "../gameSession/phaseButtonsForHost/EndDonCheckButton";
import EndRightHandCheckButton from "../gameSession/phaseButtonsForHost/EndRightHandCheckButton";
import EndYakuzaTargetButton from "../gameSession/phaseButtonsForHost/EndYakuzaTargetButton";
import EndDetectiveCheckButton from "../gameSession/phaseButtonsForHost/EndDetectiveCheckButton";
import EndDoctorHealButton from "../gameSession/phaseButtonsForHost/EndDoctorHealButton";
import FarewellSpeechControls from "../gameSession/phaseButtonsForHost/FarewellSpeechControls";
import VotingPhaseControls from "../gameSession/vote/VotingPhaseControls";
import ContinueNextRoundButton from "../gameSession/phaseButtonsForHost/ContinueNextRoundButton";
import EndGameControls from "../gameSession/phaseButtonsForHost/EndGameControls";
import DayPhaseSpeakingControls from "../gameSession/phaseButtonsForHost/DayPhaseSpeakingControls";
import StartNominatedPlayersSpeakButton from "../gameSession/phaseButtonsForHost/StartNominatedPlayersSpeakButton";
import NominatedPlayersSpeakingControls from "../gameSession/phaseButtonsForHost/NominatedPlayersSpeakingControls";
import NightActionsDisplay from "./NightActionsDisplay";
import PhaseTitle from "../ui/PhaseTitle";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Speaking state detection using SPEAKING_STATE constants:
 * - null → not started
 * - positive seat (1-12) → in progress
 * - negative seat (-1 to -12) → paused
 * - COMPLETED (-99) → speaking round completed
 */
function isSpeakingComplete(
  currentSpeakerIndex: number | null | undefined,
): boolean {
  return SPEAKING_STATE.isCompleted(currentSpeakerIndex ?? null);
}

/**
 * Builds a dynamic phase title based on game state.
 * Examples: "N1 — Mafia Chooses Target", "D1 — Voting", "Introduction"
 */
function getPhaseTitle(
  phase: string,
  nightNumber: number | null | undefined,
): string {
  const label =
    GAME_PHASE_LABELS[phase as (typeof GAME_PHASES)[number]] ?? phase;
  const night = nightNumber ?? 0;

  // Night sub-phases get "N{number}" prefix
  const nightPhases: string[] = [
    GAME_PHASES[8], // night_phase
    GAME_PHASES[9], // mafia_chooses_target
    GAME_PHASES[10], // don_checks_for_detective
    GAME_PHASES[11], // right_hand_checks_for_yakuza
    GAME_PHASES[12], // yakuza_and_shogun_chooses_target
    GAME_PHASES[13], // detective_checks_for_mafia
    GAME_PHASES[14], // doctor_heals_player
  ];

  if (nightPhases.includes(phase) && night > 0) {
    return `N${night} — ${label}`;
  }

  // Day sub-phases get "D{number}" prefix (day follows the night of the same number)
  const dayPhases: string[] = [
    GAME_PHASES[15], // farewell_speech
    GAME_PHASES[16], // day_phase
    GAME_PHASES[17], // nominated_players_speak
    GAME_PHASES[18], // voting
  ];

  if (dayPhases.includes(phase) && night > 0) {
    return `D${night} — ${label}`;
  }

  return label;
}

/**
 * Gets subtitle for speaking phases showing current/next speaker.
 */
function getSpeakingSubtitle(
  speakingOrder: number[],
  currentSpeaker: number | null | undefined,
  totalSpeakers: number,
): string | undefined {
  if (!currentSpeaker) return undefined;

  const isPaused = SPEAKING_STATE.isPaused(currentSpeaker);
  const isActive = SPEAKING_STATE.isActive(currentSpeaker);

  if (isActive) {
    const position = speakingOrder.indexOf(currentSpeaker) + 1;
    return `Player #${currentSpeaker} speaking (${position}/${totalSpeakers})`;
  }

  if (isPaused) {
    const lastSpeaker = SPEAKING_STATE.getLastSpeakerFromPaused(currentSpeaker);
    const lastIndex = speakingOrder.indexOf(lastSpeaker);

    if (lastIndex < speakingOrder.length - 1) {
      const nextSpeaker = speakingOrder[lastIndex + 1];
      const position = lastIndex + 2;
      return `Next: Player #${nextSpeaker} (${position}/${totalSpeakers})`;
    }
  }

  return undefined;
}

/**
 * Component that renders phase title + appropriate action controls for the host.
 */
const GamePhaseControls = () => {
  const { gameSessionState, gameId } = useGameRoom();
  if (!gameSessionState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <StartGameButton />
      </div>
    );
  }

  const currentPhase = gameSessionState.gamePhase;
  const title = getPhaseTitle(
    currentPhase,
    gameSessionState.currentNightNumber,
  );

  // Calculate subtitle for speaking phases
  const speakingOrder = gameSessionState.speakingOrder ?? [];
  const currentSpeaker = gameSessionState.currentSpeakerIndex ?? null;
  const isSpeakingPhase =
    (currentPhase === GAME_PHASES[7] || currentPhase === GAME_PHASES[16]) &&
    !isSpeakingComplete(currentSpeaker);

  const subtitle = isSpeakingPhase
    ? getSpeakingSubtitle(speakingOrder, currentSpeaker, speakingOrder.length)
    : undefined;

  const renderPhaseControls = () => {
    switch (currentPhase) {
      case GAME_PHASES[0]: // "game_session_started"
        return <StartPickingRolesButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[1]: // "picking_roles"
        return <ConfirmRolesButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[2]: // "mafia_meet"
        return <EndMafiaMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[3]: // "don_chooses_right_hand"
        return (
          <EndDonChooseRightHandButton gameSessionState={gameSessionState} />
        );

      case GAME_PHASES[4]: // "yakuda_shogun_meet"
        return (
          <EndYakuzaShogunMeetButton gameSessionState={gameSessionState} />
        );

      case GAME_PHASES[5]: // "detective_meet"
        return <EndDetectiveMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[6]: // "doctor_meet"
        return <EndDoctorMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[7]: // "introduction_phase"
        if (isSpeakingComplete(gameSessionState.currentSpeakerIndex)) {
          return <StartNightPhaseButton gameSessionState={gameSessionState} />;
        }
        return (
          <DayPhaseSpeakingControls
            gameId={gameId}
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[8]: // "night_phase"
        return <StartMafiaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[9]: // "mafia_chooses_target"
        return <EndMafiaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[10]: // "don_checks_for_detective"
        return <EndDonCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[11]: // "right_hand_checks_for_yakuza"
        return <EndRightHandCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[12]: // "yakuza_and_shogun_chooses_target"
        return <EndYakuzaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[13]: // "detective_checks_for_mafia"
        return <EndDetectiveCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[14]: // "doctor_heals_player"
        return <EndDoctorHealButton />;

      case GAME_PHASES[15]: // "farewell_speech"
        return <FarewellSpeechControls gameSessionState={gameSessionState} />;

      case GAME_PHASES[16]: // "day_phase"
        if (isSpeakingComplete(gameSessionState.currentSpeakerIndex)) {
          return (
            <StartNominatedPlayersSpeakButton
              gameSessionState={gameSessionState}
            />
          );
        }
        return (
          <DayPhaseSpeakingControls
            gameId={gameId}
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[17]: // "nominated_players_speak"
        return (
          <NominatedPlayersSpeakingControls
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[18]: // "voting"
        return <VotingPhaseControls />;

      case GAME_PHASES[19]: // "repeat"
        return <ContinueNextRoundButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[20]: // "end_game"
        return <EndGameControls />;

      default:
        return (
          <div className="text-xs text-slate-400">
            Unknown phase: {currentPhase}
          </div>
        );
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <NightActionsDisplay />
      <PhaseTitle title={title} subtitle={subtitle} />
      {renderPhaseControls()}
    </div>
  );
};

export default GamePhaseControls;
