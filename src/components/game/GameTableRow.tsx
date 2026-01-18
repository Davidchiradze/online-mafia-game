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
  participantCount: number;
  participantNames: string[];
  userId?: string;
  onRoomDeleted?: (gameId: string) => void;
};

export default function GameTableRow({
  session,
  onRowClick,
  participantCount,
  participantNames,
  userId,
  onRoomDeleted,
}: Props) {
  const playersLabel = GAME_TYPE_MAX_PLAYER_NUMBER[session.game_type];

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
          {participantNames.length > 0 ? (
            <Tooltip
              side="top"
              align="center"
              content={
                <div className=" flex flex-col gap-1">
                  {participantNames.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
              }
            >
              <span className="">
                {participantCount}/{playersLabel}
              </span>
            </Tooltip>
          ) : (
            <span>
              {participantCount}/{playersLabel}
            </span>
          )}
        </td>
        <td className="px-6 py-4">
          <GameStatusBadge status={session.game_status} />
        </td>
        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
          {participantCount}
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
