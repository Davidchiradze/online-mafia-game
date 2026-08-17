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
import PhaseTransitionPanel from "@/features/game-room/components/phase-controls/PhaseTransitionPanel";
import FarewellSpeechPanel from "@/features/game-room/components/phase-controls/FarewellSpeechPanel";
import VotingPanel from "@/features/game-room/components/phase-controls/VotingPanel";
import ContinueNextRoundButton from "@/features/game-room/components/phase-controls/ContinueNextRoundButton";
import EndGamePanel from "@/features/game-room/components/phase-controls/EndGamePanel";
import { GamePhase } from "@/shared/lib/constants/game";

export const JAPANESE_PHASE_CONTROLS: PhaseControlsMap = {
  // ── Pre-game ─────────────────────────────────────────────────────────────
  [GamePhase.GAME_SESSION_STARTED]: ({ gameSessionState }) => (
    <SessionStartedPanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.PICKING_ROLES]: ({ gameSessionState }) => (
    <PickingRolesPanel gameSessionState={gameSessionState} />
  ),

  // ── Night 1 meetings ─────────────────────────────────────────────────────
  [GamePhase.MAFIA_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.MAFIA_MEET}
      labelKey="endMeeting"
    />
  ),
  [GamePhase.DON_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DON_MEET}
      labelKey="endMeeting"
    />
  ),
  [GamePhase.YAKUDA_SHOGUN_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.YAKUDA_SHOGUN_MEET}
      labelKey="endMeeting"
    />
  ),
  [GamePhase.DETECTIVE_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DETECTIVE_MEET}
      labelKey="endMeeting"
    />
  ),
  [GamePhase.DOCTOR_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DOCTOR_MEET}
      labelKey="endMeeting"
    />
  ),

  // ── Speaking ─────────────────────────────────────────────────────────────
  [GamePhase.INTRODUCTION_PHASE]: ({ gameId, gameSessionState }) => (
    <IntroductionPanel gameId={gameId} gameSessionState={gameSessionState} />
  ),
  [GamePhase.DAY_PHASE]: ({ gameId, gameSessionState }) => (
    <DayPhasePanel gameId={gameId} gameSessionState={gameSessionState} />
  ),
  [GamePhase.NOMINATED_PLAYERS_SPEAK]: ({ gameId, gameSessionState }) => (
    <NominatedSpeakingPanel
      gameId={gameId}
      gameSessionState={gameSessionState}
    />
  ),

  // ── Night actions ────────────────────────────────────────────────────────
  [GamePhase.NIGHT_PHASE]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.NIGHT_PHASE}
      labelKey="startMafiaPhase"
      variant="primary"
    />
  ),
  [GamePhase.MAFIA_CHOOSES_TARGET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.MAFIA_CHOOSES_TARGET}
      labelKey="finish"
      gate="mafia"
      waitingKey="waitingForMafia"
    />
  ),
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DON_CHECKS_FOR_DETECTIVE}
      labelKey="finish"
      variant="primary"
    />
  ),
  [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET}
      labelKey="finish"
      gate="yakuza"
      waitingKey="waitingForYakuza"
    />
  ),
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DETECTIVE_CHECKS_FOR_MAFIA}
      labelKey="finish"
      variant="primary"
    />
  ),
  [GamePhase.DOCTOR_HEALS_PLAYER]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DOCTOR_HEALS_PLAYER}
      labelKey="finish"
      variant="success"
      gate="doctor"
      waitingKey="waitingForDoctor"
    />
  ),
  [GamePhase.PHASE_TRANSITION]: ({ gameSessionState }) => (
    <PhaseTransitionPanel gameSessionState={gameSessionState} />
  ),

  // ── Dawn ─────────────────────────────────────────────────────────────────
  [GamePhase.FAREWELL_SPEECH]: ({ gameSessionState }) => (
    <FarewellSpeechPanel gameSessionState={gameSessionState} />
  ),

  // ── The vote ─────────────────────────────────────────────────────────────
  [GamePhase.VOTING]: ({ gameSessionState }) => (
    <VotingPanel gameSessionState={gameSessionState} />
  ),

  // ── Game over ────────────────────────────────────────────────────────────
  // The real end screen is the `endGameState` guard in `GamePhaseControls`: an
  // outcome is decided by the `winner` field, not by reaching a phase. This
  // entry only fires if a session somehow lands on `end_game` with no outcome
  // recorded at all, where there is nothing to confirm and the only thing the
  // panel can honestly offer is the way out.
  [GamePhase.END_GAME]: () => <EndGamePanel state={{ kind: "finished", outcome: null }} />,

  // ── Not yet on the panel ─────────────────────────────────────────────────
  [GamePhase.REPEAT]: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
};
