/**
 * Sports phase → host-controls map (docs/variants/sports/rules.md §3, Phase 4).
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
import { GamePhase } from "@/shared/lib/constants/game";

export const SPORTS_PHASE_CONTROLS: PhaseControlsMap = {
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
  [GamePhase.DETECTIVE_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DETECTIVE_MEET}
      labelKey="endMeeting"
    />
  ),

  // ── Speaking ─────────────────────────────────────────────────────────────
  [GamePhase.DAY_PHASE]: ({ gameId, gameSessionState }) => (
    <DayPhasePanel gameId={gameId} gameSessionState={gameSessionState} />
  ),
  [GamePhase.NOMINATED_PLAYERS_SPEAK]: ({ gameId, gameSessionState }) => (
    <NominatedSpeakingPanel
      gameId={gameId}
      gameSessionState={gameSessionState}
    />
  ),
  [GamePhase.VOTING]: ({ gameSessionState }) => (
    <VotingPanel gameSessionState={gameSessionState} />
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
  // The night start does NOT arm the kill window — the host opens it, and the
  // advance unlocks only once it has run and closed (§5).
  [GamePhase.MAFIA_CHOOSES_TARGET]: ({ gameSessionState }) => (
    <SportsMafiaTargetPanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.DON_CHECKS_FOR_DETECTIVE}
      labelKey="finish"
      variant="primary"
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
  [GamePhase.PHASE_TRANSITION]: ({ gameSessionState }) => (
    <PhaseTransitionPanel gameSessionState={gameSessionState} />
  ),

  // ── Dawn ─────────────────────────────────────────────────────────────────
  // Best move (§6): entered from the dawn resolution when the night-1 kill
  // qualifies. The advance here is always enabled and doubles as "Skip Best
  // Move", so an AFK/disconnected victim can never deadlock the game (§6.3).
  [GamePhase.BEST_MOVE]: ({ gameSessionState }) => (
    <BestMovePanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.FAREWELL_SPEECH]: ({ gameSessionState }) => (
    <FarewellSpeechPanel gameSessionState={gameSessionState} />
  ),

  // ── Game over ────────────────────────────────────────────────────────────
  // See the Japanese map: the live end screen is the `endGameState` guard in
  // `GamePhaseControls`, and this entry is the outcome-less fallback.
  [GamePhase.END_GAME]: () => <EndGamePanel state={{ kind: "finished", outcome: null }} />,

  // ── Not yet on the panel ─────────────────────────────────────────────────
  [GamePhase.REPEAT]: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
};
