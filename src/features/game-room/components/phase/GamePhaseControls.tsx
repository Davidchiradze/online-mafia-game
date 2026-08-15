import React from "react";
import StartGamePanel from "@/features/game-room/components/phase-controls/StartGamePanel";
import EndGamePanel from "@/features/game-room/components/phase-controls/EndGamePanel";
import PhaseTitle from "@/features/game-room/components/phase/PhaseTitle";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import { endGameState } from "@/features/game-room/lib/endGame";
import { CENTER_PANEL_STACK_CLASS } from "@/features/game-room/lib/centerPanel";
import { HOST_PANEL_PHASES } from "@/features/game-room/lib/hostPanel";

/**
 * Renders the host's controls for the current phase inside the centre cell.
 *
 * Per-phase controls come from the resolved variant's `ruleset.phaseControls`
 * map (docs/engine/variant-architecture.md §2.2, Phase 4) — a phase-NAME lookup
 * that replaced the positional `GAME_PHASES[n]` switch this component used to
 * hardcode (§8). The pre-phase framing (no session / decided winner /
 * finished) stays here since it is variant-agnostic.
 *
 * Two rendering modes, and the split is the migration seam:
 *
 *  - Phases in `HOST_PANEL_PHASES` return a container-query host panel that
 *    owns the WHOLE cell, phase title included. This component adds nothing
 *    around it — a padded wrapper would break the panel's own type scale, and
 *    a `<PhaseTitle>` above it would duplicate the panel's own.
 *  - Everything else still gets the legacy padded column: phase title, then
 *    the phase's controls.
 */
const GamePhaseControls = () => {
  const { gameSessionState, gameId, ruleset } = useGameRoom();
  if (!gameSessionState) {
    return <StartGamePanel />;
  }

  // An outcome has been decided or committed — including a force-end, which
  // records no winner at all. Either way the phase the session still names is
  // stale, so the end screen wins over the phase map.
  const ending = endGameState(
    gameSessionState.winner,
    gameSessionState.isFinished,
  );
  if (ending) {
    return <EndGamePanel state={ending} />;
  }

  const currentPhase = gameSessionState.gamePhase;
  const renderControls = ruleset.phaseControls[currentPhase];

  if (renderControls && HOST_PANEL_PHASES.has(currentPhase)) {
    return renderControls({ gameId, gameSessionState });
  }

  return (
    <div className={`${CENTER_PANEL_STACK_CLASS} justify-between`}>
      <PhaseTitle gameSessionState={gameSessionState} isHost />
      {renderControls ? (
        renderControls({ gameId, gameSessionState })
      ) : (
        <div className="text-xs text-slate-400">
          Unknown phase: {currentPhase}
        </div>
      )}
    </div>
  );
};

export default GamePhaseControls;
