/**
 * Serial Killer phase → host-controls map.
 *
 * Japanese's map with the two yakuza entries replaced. A phase-NAME lookup, so
 * shared UI never branches on a variant's phase order.
 *
 * The Serial Killer's kill phase carries `gate="serial_killer"`: the host may
 * not advance past a shot the Serial Killer is entitled to take. Unlike the
 * other gates, this one also opens when the shot is unavailable — night 1, or
 * already spent — because there is then nothing to wait for and a permanently
 * disabled button would hang the game.
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

export const SERIAL_KILLER_PHASE_CONTROLS: PhaseControlsMap = {
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
  [GamePhase.SERIAL_KILLER_MEET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.SERIAL_KILLER_MEET}
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
  [GamePhase.SERIAL_KILLER_CHOOSES_TARGET]: ({ gameSessionState }) => (
    <NightPhasePanel
      gameSessionState={gameSessionState}
      sourcePhase={GamePhase.SERIAL_KILLER_CHOOSES_TARGET}
      labelKey="finish"
      gate="serial_killer"
      waitingKey="waitingForSerialKiller"
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

  // ── Dawn / the vote / game over ──────────────────────────────────────────
  [GamePhase.PHASE_TRANSITION]: ({ gameSessionState }) => (
    <PhaseTransitionPanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.FAREWELL_SPEECH]: ({ gameSessionState }) => (
    <FarewellSpeechPanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.VOTING]: ({ gameSessionState }) => (
    <VotingPanel gameSessionState={gameSessionState} />
  ),
  [GamePhase.REPEAT]: ({ gameSessionState }) => (
    <ContinueNextRoundButton gameSessionState={gameSessionState} />
  ),
  // The real end screen is the `endGameState` guard in `GamePhaseControls`: an
  // outcome is decided by the `winner` field, not by reaching a phase. This
  // entry only fires if a session lands on `end_game` with no outcome recorded.
  [GamePhase.END_GAME]: () => (
    <EndGamePanel state={{ kind: "finished", outcome: null }} />
  ),
};
