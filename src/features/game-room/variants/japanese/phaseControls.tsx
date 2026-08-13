/**
 * Japanese phase → host-controls map (docs/engine/variant-architecture.md §2.2, Phase 4).
 *
 * A byte-for-byte transcription of the `switch (currentPhase)` that used to live
 * in `GamePhaseControls`, re-keyed from positional `GAME_PHASES[n]` literals to
 * phase-NAME keys (§8). Same components, same conditional branches — no behavior
 * change. `GamePhaseControls` now looks the current phase up in the resolved
 * ruleset's map instead of branching on the Japanese phase order.
 */

import type { PhaseControlsMap } from "@/features/game-room/variants/core/types";
import SessionStartedPanel from "@/features/game-room/components/phase-controls/SessionStartedPanel";
import PickingRolesPanel from "@/features/game-room/components/phase-controls/PickingRolesPanel";
import IntroductionPanel from "@/features/game-room/components/phase-controls/IntroductionPanel";
import DayPhasePanel from "@/features/game-room/components/phase-controls/DayPhasePanel";
import NominatedSpeakingPanel from "@/features/game-room/components/phase-controls/NominatedSpeakingPanel";
import EndDonChooseRightHandButton from "@/features/game-room/components/phase-controls/EndDonChooseRightHandButton";
import PhaseAdvanceButton from "@/features/game-room/components/phase-controls/PhaseAdvanceButton";
import EndMafiaTargetButton from "@/features/game-room/components/phase-controls/EndMafiaTargetButton";
import EndYakuzaTargetButton from "@/features/game-room/components/phase-controls/EndYakuzaTargetButton";
import EndDoctorHealButton from "@/features/game-room/components/phase-controls/EndDoctorHealButton";
import FarewellSpeechControls from "@/features/game-room/components/phase-controls/FarewellSpeechControls";
import VotingPhaseControls from "@/features/game-room/components/voting/VotingPhaseControls";
import ContinueNextRoundButton from "@/features/game-room/components/phase-controls/ContinueNextRoundButton";
import EndGameControls from "@/features/game-room/components/phase-controls/EndGameControls";
import StartNextPhaseButton from "@/features/game-room/components/phase-controls/StartNextPhaseButton";

export const JAPANESE_PHASE_CONTROLS: PhaseControlsMap = {
  // Pre-game and speaking states render the full host panel (it owns the whole
  // centre cell, phase title included) — see HOST_PANEL_PHASES in
  // lib/hostPanel.ts. Their internal branching (run in progress vs complete,
  // foul elimination, no nominees) moved INTO the panels, so the map entry is
  // a plain lookup again.
  game_session_started: ({ gameSessionState }) => (
    <SessionStartedPanel gameSessionState={gameSessionState} />
  ),
  picking_roles: ({ gameSessionState }) => (
    <PickingRolesPanel gameSessionState={gameSessionState} />
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
  introduction_phase: ({ gameId, gameSessionState }) => (
    <IntroductionPanel gameId={gameId} gameSessionState={gameSessionState} />
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
      labelKey="finish"
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
      labelKey="finish"
      variant="primary"
    />
  ),
  doctor_heals_player: () => <EndDoctorHealButton />,
  farewell_speech: ({ gameSessionState }) => (
    <FarewellSpeechControls gameSessionState={gameSessionState} />
  ),
  day_phase: ({ gameId, gameSessionState }) => (
    <DayPhasePanel gameId={gameId} gameSessionState={gameSessionState} />
  ),
  nominated_players_speak: ({ gameId, gameSessionState }) => (
    <NominatedSpeakingPanel
      gameId={gameId}
      gameSessionState={gameSessionState}
    />
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
