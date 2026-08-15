"use client";

import { useTranslations } from "next-intl";
import { GAME_PHASES } from "@/shared/lib/constants/game";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import PlayerPhasePanel from "./PlayerPhasePanel";
import PlayerPickingPanel from "./PlayerPickingPanel";
import PlayerVotingPanel from "./PlayerVotingPanel";
import PlayerEndGamePanel from "./PlayerEndGamePanel";

/**
 * The centre cell, for everyone who is not the host.
 *
 * Same shell as the host's — so a landscape phone gets the same one-row bar
 * instead of a clipped column — with a much shorter list of states, because a
 * player only ever has one thing to do here. Three states earn their own
 * component (dealing, voting, the result); everything else is the read-only
 * phase panel.
 *
 * The end screen is gated on `isFinished` rather than on a decided winner: the
 * host confirms the end, and until they do the result is theirs to announce.
 */
export default function PlayerPanel() {
  const t = useTranslations("game.player");
  const tHost = useTranslations("game.host");
  const { gameSessionState, votingSession } = useGameRoom();

  // No session yet — the lobby is still filling.
  if (!gameSessionState) {
    return (
      <HostPanel
        descriptor={{
          eyebrow: tHost("preGame"),
          title: t("waitingToStart"),
          actions: [],
        }}
      />
    );
  }

  if (gameSessionState.isFinished) {
    return <PlayerEndGamePanel outcome={gameSessionState.winner ?? null} />;
  }

  if (gameSessionState.gamePhase === GAME_PHASES[1] /* picking_roles */) {
    return <PlayerPickingPanel />;
  }

  // Until the voting session's first round trip lands there is nothing to vote
  // on, and the read-only phase panel is the honest thing to show.
  if (
    gameSessionState.gamePhase === GAME_PHASES[18] /* voting */ &&
    votingSession
  ) {
    return <PlayerVotingPanel />;
  }

  return <PlayerPhasePanel />;
}
