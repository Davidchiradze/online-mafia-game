"use client";

import { useEffect } from "react";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { joinGamePlayer } from "@/lib/gamePlayers/actions";

type Params = {
  gameId: string;
  isHost: boolean;
  joinStatus: JoinRequest["status"] | undefined;
  hasPlayerRecord: boolean;
  setIsJoiningGame: (v: boolean) => void;
  setJoinError: (v: string | null) => void;
  setHasPlayerRecord: (v: boolean) => void;
  setCurrentHostId: (v: string | null) => void;
};

/**
 * Ensures the current user has a game_players row with a seat (or host sentinel) before LiveKit connect.
 */
export function useEnsurePlayerSeat({
  gameId,
  isHost,
  joinStatus,
  hasPlayerRecord,
  setIsJoiningGame,
  setJoinError,
  setHasPlayerRecord,
  setCurrentHostId,
}: Params) {
  useEffect(() => {
    const canConnect = isHost || joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED;
    if (!canConnect || hasPlayerRecord) return;

    const ensurePlayerSeat = async () => {
      setIsJoiningGame(true);
      setJoinError(null);
      try {
        const res = await joinGamePlayer(gameId);
        if (!res?.ok) {
          setJoinError(res?.message || "Unable to join game");
          return;
        }
        if (
          !isHost &&
          (res.player.seat_number === null ||
            res.player.seat_number === undefined)
        ) {
          setJoinError("Unable to reserve a seat. Please retry.");
          return;
        }

        setHasPlayerRecord(true);
        setJoinError(null);
        if (res.game?.host_id) setCurrentHostId(res.game.host_id);
      } catch (err) {
        setJoinError(
          err instanceof Error ? err.message : "Unable to join game"
        );
      } finally {
        setIsJoiningGame(false);
      }
    };

    void ensurePlayerSeat();
  }, [
    gameId,
    hasPlayerRecord,
    isHost,
    joinStatus,
    setCurrentHostId,
    setHasPlayerRecord,
    setIsJoiningGame,
    setJoinError,
  ]);
}
