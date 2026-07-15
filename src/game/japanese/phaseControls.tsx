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
import type { PhaseControlsMap } from "../core/types";
import StartPickingRolesButton from "@/components/gameSession/phaseButtonsForHost/StartPickingRolesButton";
import ConfirmRolesButton from "@/components/gameSession/phaseButtonsForHost/ConfirmRolesButton";
import EndMafiaMeetButton from "@/components/gameSession/phaseButtonsForHost/EndMafiaMeetButton";
import EndDonChooseRightHandButton from "@/components/gameSession/phaseButtonsForHost/EndDonChooseRightHandButton";
import EndYakuzaShogunMeetButton from "@/components/gameSession/phaseButtonsForHost/EndYakuzaShogunMeetButton";
import EndDetectiveMeetButton from "@/components/gameSession/phaseButtonsForHost/EndDetectiveMeetButton";
import EndDoctorMeetButton from "@/components/gameSession/phaseButtonsForHost/EndDoctorMeetButton";
import StartNightPhaseButton from "@/components/gameSession/phaseButtonsForHost/StartNightPhaseButton";
import StartMafiaTargetButton from "@/components/gameSession/phaseButtonsForHost/StartMafiaTargetButton";
import EndMafiaTargetButton from "@/components/gameSession/phaseButtonsForHost/EndMafiaTargetButton";
import EndDonCheckButton from "@/components/gameSession/phaseButtonsForHost/EndDonCheckButton";
import EndRightHandCheckButton from "@/components/gameSession/phaseButtonsForHost/EndRightHandCheckButton";
import EndYakuzaTargetButton from "@/components/gameSession/phaseButtonsForHost/EndYakuzaTargetButton";
import EndDetectiveCheckButton from "@/components/gameSession/phaseButtonsForHost/EndDetectiveCheckButton";
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
    <EndMafiaMeetButton gameSessionState={gameSessionState} />
  ),
  don_chooses_right_hand: ({ gameSessionState }) => (
    <EndDonChooseRightHandButton gameSessionState={gameSessionState} />
  ),
  yakuda_shogun_meet: ({ gameSessionState }) => (
    <EndYakuzaShogunMeetButton gameSessionState={gameSessionState} />
  ),
  detective_meet: ({ gameSessionState }) => (
    <EndDetectiveMeetButton gameSessionState={gameSessionState} />
  ),
  doctor_meet: ({ gameSessionState }) => (
    <EndDoctorMeetButton gameSessionState={gameSessionState} />
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
    <StartMafiaTargetButton gameSessionState={gameSessionState} />
  ),
  mafia_chooses_target: ({ gameSessionState }) => (
    <EndMafiaTargetButton gameSessionState={gameSessionState} />
  ),
  don_checks_for_detective: ({ gameSessionState }) => (
    <EndDonCheckButton gameSessionState={gameSessionState} />
  ),
  right_hand_checks_for_yakuza: ({ gameSessionState }) => (
    <EndRightHandCheckButton gameSessionState={gameSessionState} />
  ),
  yakuza_and_shogun_chooses_target: ({ gameSessionState }) => (
    <EndYakuzaTargetButton gameSessionState={gameSessionState} />
  ),
  detective_checks_for_mafia: ({ gameSessionState }) => (
    <EndDetectiveCheckButton gameSessionState={gameSessionState} />
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
