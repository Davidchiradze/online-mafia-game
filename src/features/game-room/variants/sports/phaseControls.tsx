/**
 * Sports phase → host-controls map (docs/variants/sports.md §3, Phase 4).
 *
 * Reuses the SHARED, variant-agnostic panels for everything (card picking, day
 * and nominated speaking, the generic night advances, the neutral buffer). The
 * destination of each advance comes from the resolved ruleset's
 * `sportsAdvanceUpdates` graph, so the same `NightPhasePanel` lands somewhere
 * different here than it does in Japanese.
 *
 * Two entries are genuinely Sports-only: the `unanimous-vote` kill window (§5)
 * and best move (§6). Sports has no introduction phase, no yakuza and no
 * doctor, so those phases are simply absent.
 */

import type { PhaseControlsMap } from "@/features/game-room/variants/core/types";
import SessionStartedPanel from "@/features/game-room/components/phase-controls/SessionStartedPanel";
import PickingRolesPanel from "@/features/game-room/components/phase-controls/PickingRolesPanel";
import DayPhasePanel from "@/features/game-room/components/phase-controls/DayPhasePanel";
import NominatedSpeakingPanel from "@/features/game-room/components/phase-controls/NominatedSpeakingPanel";
import NightPhasePanel from "@/features/game-room/components/phase-controls/NightPhasePanel";
import SportsMafiaTargetPanel from "@/features/game-room/components/phase-controls/SportsMafiaTargetPanel";
import PhaseTransitionPanel from "@/features/game-room/components/phase-controls/PhaseTransitionPanel";
import BestMovePanel from "@/features/game-room/components/phase-controls/BestMovePanel";
import FarewellSpeechPanel from "@/features/game-room/components/phase-controls/FarewellSpeechPanel";
import VotingPanel from "@/features/game-room/components/phase-controls/VotingPanel";
import ContinueNextRoundButton from "@/features/game-room/components/phase-controls/ContinueNextRoundButton";
import EndGamePanel from "@/features/game-room/components/phase-controls/EndGamePanel";

export const SPORTS_PHASE_CONTROLS: PhaseControlsMap = {
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
  don_meet: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="don_meet"
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

  // ── Speaking ─────────────────────────────────────────────────────────────
  day_phase: ({ gameId, gameSessionState }) => (
    <DayPhasePanel gameId={gameId} gameSessionState={gameSessionState} />
  ),
  nominated_players_speak: ({ gameId, gameSessionState }) => (
    <NominatedSpeakingPanel
      gameId={gameId}
      gameSessionState={gameSessionState}
    />
  ),
  voting: ({ gameSessionState }) => (
    <VotingPanel gameSessionState={gameSessionState} />
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
  // The night start does NOT arm the kill window — the host opens it, and the
  // advance unlocks only once it has run and closed (§5).
  mafia_chooses_target: ({ gameSessionState }) => (
    <SportsMafiaTargetPanel gameSessionState={gameSessionState} />
  ),
  don_checks_for_detective: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase="don_checks_for_detective"
      labelKey="finish"
      variant="primary"
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
  phase_transition: ({ gameSessionState }) => (
    <PhaseTransitionPanel gameSessionState={gameSessionState} />
  ),

  // ── Dawn ─────────────────────────────────────────────────────────────────
  // Best move (§6): entered from the dawn resolution when the night-1 kill
  // qualifies. The advance here is always enabled and doubles as "Skip Best
  // Move", so an AFK/disconnected victim can never deadlock the game (§6.3).
  best_move: ({ gameSessionState }) => (
    <BestMovePanel gameSessionState={gameSessionState} />
  ),
  farewell_speech: ({ gameSessionState }) => (
    <FarewellSpeechPanel gameSessionState={gameSessionState} />
  ),

  // ── Game over ────────────────────────────────────────────────────────────
  // See the Japanese map: the live end screen is the `endGameState` guard in
  // `GamePhaseControls`, and this entry is the outcome-less fallback.
  end_game: () => <EndGamePanel state={{ kind: "finished", outcome: null }} />,

  // ── Not yet on the panel ─────────────────────────────────────────────────
  repeat: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
};
