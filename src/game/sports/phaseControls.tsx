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

import { SPEAKING_STATE } from "@/shared/lib/constants/game";
import type { PhaseControlsMap } from "@/game/core/types";
import StartPickingRolesButton from "@/features/game-room/components/phase-controls/StartPickingRolesButton";
import ConfirmRolesButton from "@/features/game-room/components/phase-controls/ConfirmRolesButton";
import PhaseAdvanceButton from "@/features/game-room/components/phase-controls/PhaseAdvanceButton";
import SportsMafiaTargetControls from "@/features/game-room/components/phase-controls/SportsMafiaTargetControls";
import BestMoveControls from "@/features/game-room/components/phase-controls/BestMoveControls";
import FarewellSpeechControls from "@/features/game-room/components/phase-controls/FarewellSpeechControls";
import VotingPhaseControls from "@/features/game-room/components/voting/VotingPhaseControls";
import ContinueNextRoundButton from "@/features/game-room/components/phase-controls/ContinueNextRoundButton";
import EndGameControls from "@/features/game-room/components/phase-controls/EndGameControls";
import DayPhaseSpeakingControls from "@/features/game-room/components/phase-controls/DayPhaseSpeakingControls";
import StartNominatedPlayersSpeakButton from "@/features/game-room/components/phase-controls/StartNominatedPlayersSpeakButton";
import StartVotingButton from "@/features/game-room/components/phase-controls/StartVotingButton";
import NominatedPlayersSpeakingControls from "@/features/game-room/components/phase-controls/NominatedPlayersSpeakingControls";
import StartNextPhaseButton from "@/features/game-room/components/phase-controls/StartNextPhaseButton";

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
  don_meet: ({ gameSessionState }) => (
    <PhaseAdvanceButton
      gameSessionState={gameSessionState}
      sourcePhase="don_meet"
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
  // Best move (§6): entered from the dawn resolution when the night-1 kill
  // qualifies. The advance here is always enabled and doubles as "Skip Best
  // Move", so an AFK/disconnected victim can never deadlock the game (§6.3).
  best_move: ({ gameSessionState }) => (
    <BestMoveControls gameSessionState={gameSessionState} />
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
