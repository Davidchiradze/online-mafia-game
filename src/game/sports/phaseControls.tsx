/**
 * Sports phase → host-controls map (docs/sports-mafia.md §3, Phase 4).
 *
 * Reuses the SHARED, variant-agnostic controls (card picking, day/nominated
 * speaking, voting, farewell, continue, end, and the neutral-buffer
 * `StartNextPhaseButton`) and uses the generic `PhaseAdvanceButton` for the
 * meet/check advances whose destination differs from Japanese (resolved via the
 * ruleset's `sportsAdvanceUpdates` graph). The one bespoke control is the night
 * start, which also arms the 5s kill-selection window (§5).
 *
 * The interactive per-mafia kill buttons + selection indicator (§5.4) and the
 * seat geometry (P4-T5) are separate; this map only wires the HOST phase
 * controls.
 */

import { SPEAKING_STATE } from "@/lib/constants/game";
import type { PhaseControlsMap } from "../core/types";
import StartPickingRolesButton from "@/components/gameSession/phaseButtonsForHost/StartPickingRolesButton";
import ConfirmRolesButton from "@/components/gameSession/phaseButtonsForHost/ConfirmRolesButton";
import PhaseAdvanceButton from "@/components/gameSession/phaseButtonsForHost/PhaseAdvanceButton";
import SportsMafiaTargetControls from "@/components/gameSession/phaseButtonsForHost/SportsMafiaTargetControls";
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

export const SPORTS_PHASE_CONTROLS: PhaseControlsMap = {
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
  detective_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="detective_meet"
      labelKey="endMeeting"
    />
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
  night_phase: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="night_phase"
      labelKey="startMafiaPhase"
    />
  ),
  // The night start no longer arms the kill window — the host opens it (and the
  // next-phase button unlocks) from within `mafia_chooses_target` (§5).
  mafia_chooses_target: ({ gameSessionState }) => (
    <SportsMafiaTargetControls gameSessionState={gameSessionState} />
  ),
  don_checks_for_detective: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="don_checks_for_detective"
      labelKey="endDonCheck"
      variant="primary"
    />
  ),
  detective_checks_for_mafia: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="detective_checks_for_mafia"
      labelKey="endDetectiveCheck"
      variant="primary"
    />
  ),
  farewell_speech: ({ gameSessionState }) => (
    <FarewellSpeechControls gameSessionState={gameSessionState} />
  ),
  repeat: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
  end_game: () => <EndGameControls />,
  phase_transition: ({ gameSessionState }) => (
    <StartNextPhaseButton gameSessionState={gameSessionState} />
  ),
};
