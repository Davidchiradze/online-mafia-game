import React from "react";
import StartGameButton from "@/components/gameSession/phaseButtonsForHost/StartGameButton";
import NightActionsDisplay from "./NightActionsDisplay";
import PhaseTitle from "@/shared/ui/PhaseTitle";
import WinnerBanner from "@/components/host-controls/WinnerBanner";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

/**
 * Renders the phase title + the host's action controls for the current phase.
 *
 * The per-phase controls come from the resolved variant's `ruleset.phaseControls`
 * map (docs/game-types.md §2.2, Phase 4) — a phase-NAME lookup that replaced the
 * positional `GAME_PHASES[n]` switch this component used to hardcode (§8). The
 * pre-phase framing (no session / decided winner / finished) stays here since it
 * is variant-agnostic.
 */
const GamePhaseControls = () => {
  const { gameSessionState, gameId, ruleset } = useGameRoom();
  if (!gameSessionState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <StartGameButton />
      </div>
    );
  }

  // A faction has been auto-decided: show the win banner. While the game is not
  // finished yet, include the host's "Finish Game" button to confirm the end.
  if (gameSessionState.winner) {
    return (
      <WinnerBanner
        gameId={gameId}
        winner={gameSessionState.winner}
        canFinish={!gameSessionState.isFinished}
      />
    );
  }

  // The game was finished with no decided winner (e.g. an admin force-ended it):
  // show the "No Contest" end state instead of stale live-phase controls.
  if (gameSessionState.isFinished) {
    return <WinnerBanner gameId={gameId} winner={null} />;
  }

  const currentPhase = gameSessionState.gamePhase;
  const renderControls = ruleset.phaseControls[currentPhase];

  return (
    <div className="w-full h-full flex flex-col items-center gap-3 justify-between">
      <NightActionsDisplay />
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
