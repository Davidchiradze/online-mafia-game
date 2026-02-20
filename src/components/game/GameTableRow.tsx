"use client";

import { GameRoom } from "@/types/game/type";
import {
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
  SPECTATOR,
} from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import ClickableTooltip from "@/components/ui/ClickableTooltip";
import GameTableRowActions from "./GameTableRowActions";
import { InfoIcon, SkullIcon } from "@/assets/icons";

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
  const spectators = session.spectators ?? [];
  const spectatorCount = spectators.length;

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
          <div className="flex items-center gap-2">
            <span>
              {playerCount}/{maxPlayers + 1}
            </span>
            {players.length > 0 && (
              <ClickableTooltip
                content={
                  <div>
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Players ({playerCount})
                      </span>
                    </div>
                    <ul className="max-h-48 overflow-auto py-1">
                      {players.map((player, idx) => (
                        <li
                          key={player.player_id ?? idx}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <span
                            className={`flex-1 truncate ${
                              player.is_alive === false
                                ? "text-gray-400 dark:text-gray-500 line-through"
                                : ""
                            }`}
                          >
                            {player.nickname ?? "Player"}
                          </span>
                          {player.is_alive === false && (
                            <SkullIcon
                              size={14}
                              className="text-red-400 dark:text-red-500 flex-shrink-0"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                }
                side="bottom"
                align="start"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <InfoIcon size={12} className="text-gray-500 dark:text-gray-400" />
                </span>
              </ClickableTooltip>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <GameStatusBadge status={session.game_status} />
        </td>
        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className={spectatorCount === 0 ? "text-gray-400 dark:text-gray-500" : ""}>
              {spectatorCount}/{SPECTATOR.MAX_SPECTATORS_PER_GAME}
            </span>
            {spectatorCount > 0 && (
              <ClickableTooltip
                content={
                  <div>
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Spectators ({spectatorCount})
                      </span>
                    </div>
                    <ul className="max-h-48 overflow-auto py-1">
                      {spectators.map((spectator, idx) => (
                        <li
                          key={spectator.user_id ?? idx}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <span className="flex-1 truncate">
                            {spectator.nickname ?? "Spectator"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                }
                side="bottom"
                align="start"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <InfoIcon size={12} className="text-gray-500 dark:text-gray-400" />
                </span>
              </ClickableTooltip>
            )}
          </div>
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
