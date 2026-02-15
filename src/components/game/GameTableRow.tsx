"use client";

import { GameRoom } from "@/types/game/type";
import {
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
} from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import Tooltip from "@/components/ui/Tooltip";
import GameTableRowActions from "./GameTableRowActions";

type Props = {
  session: GameRoom;
  onRowClick?: (session: GameRoom) => void;
  userId?: string;
  onRoomDeleted?: (gameId: string) => void;
};

export default function GameTableRow({
  session,
  onRowClick,
  userId,
  onRoomDeleted,
}: Props) {
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[session.game_type];
  const players = session.players;
  const playerCount = players.length;

  return (
    <>
      <tr
        key={session.id}
        onClick={() => onRowClick?.(session)}
        className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
          {session.name}
        </td>
        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
          {GAME_TYPE_LABEL[session.game_type]}
        </td>
        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
          {players.length > 0 ? (
            <Tooltip
              side="top"
              align="center"
              content={
                <div className=" flex flex-col gap-1">
                  {players.map((player) => (
                    <span key={player.id}>{player.nickname ?? "Player"}</span>
                  ))}
                </div>
              }
            >
              <span className="">
                {playerCount}/{maxPlayers + 1}
              </span>
            </Tooltip>
          ) : (
            <span>
              {playerCount}/{maxPlayers + 1}
            </span>
          )}
        </td>
        <td className="px-6 py-4">
          <GameStatusBadge status={session.game_status} />
        </td>
        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
          {playerCount}
        </td>
        <td className="px-6 py-4 relative">
          <div className="relative">
            <GameTableRowActions
              session={session}
              userId={userId}
              onRoomDeleted={onRoomDeleted}
            />
          </div>
        </td>
      </tr>
    </>
  );
}
