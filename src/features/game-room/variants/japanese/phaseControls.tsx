/**
 * Japanese phase → host-controls map (docs/engine/variant-architecture.md §2.2, Phase 4).
 *
 * A phase-NAME lookup (§8 "phases by name, never by index") that `GamePhaseControls`
 * reads from the resolved ruleset, so shared UI never branches on the Japanese
 * phase order.
 *
 * Most entries are now a full host panel that owns the whole centre cell,
 * phase title included — see HOST_PANEL_PHASES in lib/hostPanel.ts. Every night
 * state that is just "a role is awake, close the phase when they are done" is
 * the same `NightPhasePanel` with a different label and gate; the three that
 * are genuinely different get their own component.
 */

import type { PhaseControlsMap } from "@/features/game-room/variants/core/types";
import SessionStartedPanel from "@/features/game-room/components/phase-controls/SessionStartedPanel";
import PickingRolesPanel from "@/features/game-room/components/phase-controls/PickingRolesPanel";
import IntroductionPanel from "@/features/game-room/components/phase-controls/IntroductionPanel";
import DayPhasePanel from "@/features/game-room/components/phase-controls/DayPhasePanel";
import NominatedSpeakingPanel from "@/features/game-room/components/phase-controls/NominatedSpeakingPanel";
import NightPhasePanel from "@/features/game-room/components/phase-controls/NightPhasePanel";
import DonRightHandPanel from "@/features/game-room/components/phase-controls/DonRightHandPanel";
import PhaseTransitionPanel from "@/features/game-room/components/phase-controls/PhaseTransitionPanel";
import FarewellSpeechPanel from "@/features/game-room/components/phase-controls/FarewellSpeechPanel";
import VotingPanel from "@/features/game-room/components/phase-controls/VotingPanel";
import ContinueNextRoundButton from "@/features/game-room/components/phase-controls/ContinueNextRoundButton";
import EndGameControls from "@/features/game-room/components/phase-controls/EndGameControls";

export const JAPANESE_PHASE_CONTROLS: PhaseControlsMap = {
  // ── Pre-game ─────────────────────────────────────────────────────────────
  game_session_started: ({ gameSessionState }) => (
    <SessionStartedPanel gameSessionState={gameSessionState} />
  ),
  picking_roles: ({ gameSessionState }) => (
    <PickingRolesPanel gameSessionState={gameSessionState} />
  ),

  // ── Night 1 meetings ─────────────────────────────────────────────────────
  mafia_meet: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="mafia_meet"
      labelKey="endMeeting"
    />
  ),
  don_chooses_right_hand: ({ gameSessionState }) => (
    <DonRightHandPanel gameSessionState={gameSessionState} />
  ),
  yakuda_shogun_meet: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="yakuda_shogun_meet"
      labelKey="endMeeting"
    />
  ),
  detective_meet: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="detective_meet"
      labelKey="endMeeting"
    />
  ),
  doctor_meet: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="doctor_meet"
      labelKey="endMeeting"
    />
  ),

  // ── Speaking ─────────────────────────────────────────────────────────────
  introduction_phase: ({ gameId, gameSessionState }) => (
    <IntroductionPanel gameId={gameId} gameSessionState={gameSessionState} />
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

  // ── Night actions ────────────────────────────────────────────────────────
  night_phase: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="night_phase"
      labelKey="startMafiaPhase"
      variant="primary"
    />
  ),
  mafia_chooses_target: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="mafia_chooses_target"
      labelKey="finish"
      gate="mafia"
      waitingKey="waitingForMafia"
    />
  ),
  don_checks_for_detective: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="don_checks_for_detective"
      labelKey="finish"
      variant="primary"
    />
  ),
  right_hand_checks_for_yakuza: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="right_hand_checks_for_yakuza"
      labelKey="endCheck"
      variant="primary"
    />
  ),
  yakuza_and_shogun_chooses_target: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="yakuza_and_shogun_chooses_target"
      labelKey="finish"
      gate="yakuza"
      waitingKey="waitingForYakuza"
    />
  ),
  detective_checks_for_mafia: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="detective_checks_for_mafia"
      labelKey="finish"
      variant="primary"
    />
  ),
  doctor_heals_player: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="doctor_heals_player"
      labelKey="finish"
      variant="success"
      gate="doctor"
      waitingKey="waitingForDoctor"
    />
  ),
  phase_transition: ({ gameSessionState }) => (
    <PhaseTransitionPanel gameSessionState={gameSessionState} />
  ),

  // ── Dawn ─────────────────────────────────────────────────────────────────
  farewell_speech: ({ gameSessionState }) => (
    <FarewellSpeechPanel gameSessionState={gameSessionState} />
  ),

  // ── The vote ─────────────────────────────────────────────────────────────
  voting: ({ gameSessionState }) => (
    <VotingPanel gameSessionState={gameSessionState} />
  ),

  // ── Not yet on the panel ─────────────────────────────────────────────────
  repeat: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
  end_game: () => <EndGameControls />,
};
