"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { dayRoundFromNightNumber } from "@convex/games/core/dayRound";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import RegularVotingPanel from "./RegularVotingPanel";
import BothLeaveVotingPanel from "./BothLeaveVotingPanel";

type VotingPanelProps = {
  gameSessionState: GameSessionState;
};

/**
 * Routes the voting phase between its two modes.
 *
 * The result note is owned HERE rather than by either panel because the swap
 * between them is itself a result: tallying a second identical tie sets
 * "Same tie! Vote: should all leave?" and flips `bothLeaveVoteActive` in the
 * same breath, unmounting the panel that produced the sentence. Held one level
 * up, the explanation survives into the mode it is explaining.
 */
export default function VotingPanel({ gameSessionState }: VotingPanelProps) {
  const t = useTranslations("common");
  const tHost = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { votingSession } = useGameRoom();
  const [note, setNote] = useState<string | null>(null);

  // The session is created server-side on phase entry, so this is the query's
  // first round trip, not a state the host can get stuck in.
  if (!votingSession) {
    return (
      <HostPanel
        descriptor={{
          eyebrow: tHost("dayCounter", {
            day: dayRoundFromNightNumber(gameSessionState.currentNightNumber),
          }),
          title: tPhases("voting"),
          status: t("loading"),
          actions: [],
        }}
      />
    );
  }

  if (votingSession.bothLeaveVoteActive) {
    return <BothLeaveVotingPanel note={note} setNote={setNote} />;
  }

  return (
    <RegularVotingPanel
      gameSessionState={gameSessionState}
      note={note}
      setNote={setNote}
    />
  );
}
