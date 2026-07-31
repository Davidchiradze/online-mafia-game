/**
 * Japanese phase → host-controls map (docs/game-types.md §2.2, Phase 4).
 *
 * A byte-for-byte transcription of the `switch (currentPhase)` that used to live
 * in `GamePhaseControls`, re-keyed from positional `GAME_PHASES[n]` literals to
 * phase-NAME keys (§8). Same components, same conditional branches — no behavior
 * change. `GamePhaseControls` now looks the current phase up in the resolved
 * ruleset's map instead of branching on the Japanese phase order.
 */

import { SPEAKING_STATE } from "@/lib/constants/game";
import type { PhaseControlsMap } from "@/game/core/types";
import StartPickingRolesButton from "@/components/gameSession/phaseButtonsForHost/StartPickingRolesButton";
import ConfirmRolesButton from "@/components/gameSession/phaseButtonsForHost/ConfirmRolesButton";
import EndDonChooseRightHandButton from "@/components/gameSession/phaseButtonsForHost/EndDonChooseRightHandButton";
import PhaseAdvanceButton from "@/components/gameSession/phaseButtonsForHost/PhaseAdvanceButton";
import StartNightPhaseButton from "@/components/gameSession/phaseButtonsForHost/StartNightPhaseButton";
import EndMafiaTargetButton from "@/components/gameSession/phaseButtonsForHost/EndMafiaTargetButton";
import EndYakuzaTargetButton from "@/components/gameSession/phaseButtonsForHost/EndYakuzaTargetButton";
import EndDoctorHealButton from "@/components/gameSession/phaseButtonsForHost/EndDoctorHealButton";
import FarewellSpeechControls from "@/components/gameSession/phaseButtonsForHost/FarewellSpeechControls";
import VotingPhaseControls from "@/components/gameSession/vote/VotingPhaseControls";
import ContinueNextRoundButton from "@/components/gameSession/phaseButtonsForHost/ContinueNextRoundButton";
import EndGameControls from "@/components/gameSession/phaseButtonsForHost/EndGameControls";
import DayPhaseSpeakingControls from "@/components/gameSession/phaseButtonsForHost/DayPhaseSpeakingControls";
import StartNominatedPlayersSpeakButton from "@/components/gameSession/phaseButtonsForHost/StartNominatedPlayersSpeakButton";
import StartVotingButton from "@/components/gameSession/phaseButtonsForHost/StartVotingButton";
import NominatedPlayersSpeakingControls from "@/components/gameSession/phaseButtonsForHost/NominatedPlayersSpeakingControls";
import StartNextPhaseButton from "@/components/gameSession/phaseButtonsForHost/StartNextPhaseButton";

function isSpeakingComplete(
  currentSpeakerIndex: number | null | undefined,
): boolean {
  return SPEAKING_STATE.isCompleted(currentSpeakerIndex ?? null);
}

export const JAPANESE_PHASE_CONTROLS: PhaseControlsMap = {
  game_session_started: ({ gameSessionState }) => (
    <StartPickingRolesButton gameSessionState={gameSessionState} />
  ),
  picking_roles: ({ gameSessionState }) => (
    <ConfirmRolesButton gameSessionState={gameSessionState} />
  ),
  mafia_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="mafia_meet"
      labelKey="endMeeting"
    />
  ),
  don_chooses_right_hand: ({ gameSessionState }) => (
    <EndDonChooseRightHandButton gameSessionState={gameSessionState} />
  ),
  yakuda_shogun_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="yakuda_shogun_meet"
      labelKey="endMeeting"
    />
  ),
  detective_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="detective_meet"
      labelKey="endMeeting"
    />
  ),
  doctor_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="doctor_meet"
      labelKey="endMeeting"
    />
  ),
  introduction_phase: ({ gameId, gameSessionState }) =>
    isSpeakingComplete(gameSessionState.currentSpeakerIndex) ? (
      <StartNightPhaseButton gameSessionState={gameSessionState} />
    ) : (
      <DayPhaseSpeakingControls
        gameId={gameId}
        gameSessionState={gameSessionState}
      />
    ),
  night_phase: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="night_phase"
      labelKey="startMafiaPhase"
    />
  ),
  mafia_chooses_target: ({ gameSessionState }) => (
    <EndMafiaTargetButton gameSessionState={gameSessionState} />
  ),
  don_checks_for_detective: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="don_checks_for_detective"
      labelKey="endDonCheck"
      variant="primary"
    />
  ),
  right_hand_checks_for_yakuza: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="right_hand_checks_for_yakuza"
      labelKey="endCheck"
      variant="primary"
    />
  ),
  yakuza_and_shogun_chooses_target: ({ gameSessionState }) => (
    <EndYakuzaTargetButton gameSessionState={gameSessionState} />
  ),
  detective_checks_for_mafia: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="detective_checks_for_mafia"
      labelKey="endDetectiveCheck"
      variant="primary"
    />
  ),
  doctor_heals_player: () => <EndDoctorHealButton />,
  farewell_speech: ({ gameSessionState }) => (
    <FarewellSpeechControls gameSessionState={gameSessionState} />
  ),
  day_phase: ({ gameId, gameSessionState }) => {
    if (isSpeakingComplete(gameSessionState.currentSpeakerIndex)) {
      return gameSessionState.withoutSelfJustification ? (
        <StartVotingButton gameSessionState={gameSessionState} />
      ) : (
        <StartNominatedPlayersSpeakButton gameSessionState={gameSessionState} />
      );
    }
    return (
      <DayPhaseSpeakingControls
        gameId={gameId}
        gameSessionState={gameSessionState}
      />
    );
  },
  nominated_players_speak: ({ gameSessionState }) => (
    <NominatedPlayersSpeakingControls gameSessionState={gameSessionState} />
  ),
  voting: () => <VotingPhaseControls />,
  repeat: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
  end_game: () => <EndGameControls />,
  phase_transition: ({ gameSessionState }) => (
    <StartNextPhaseButton gameSessionState={gameSessionState} />
  ),
};
