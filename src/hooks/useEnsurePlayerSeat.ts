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
  isJoiningGame: boolean;
  setIsJoiningGame: (v: boolean) => void;
  setJoinError: (v: string | null) => void;
  setHasPlayerRecord: (v: boolean) => void;
  setMaxPlayers: (v: number | null) => void;
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
  isJoiningGame,
  setIsJoiningGame,
  setJoinError,
  setHasPlayerRecord,
  setMaxPlayers,
  setCurrentHostId,
}: Params) {
  useEffect(() => {
    const canConnect = isHost || joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED;
    if (!canConnect || hasPlayerRecord || isJoiningGame) return;

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
        if (
          res.game?.max_players !== null &&
          res.game?.max_players !== undefined
        )
          setMaxPlayers(res.game.max_players);
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
    isJoiningGame,
    joinStatus,
    setCurrentHostId,
    setHasPlayerRecord,
    setIsJoiningGame,
    setJoinError,
    setMaxPlayers,
  ]);
}
