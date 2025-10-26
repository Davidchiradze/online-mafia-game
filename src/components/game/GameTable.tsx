"use client";

import { useMemo } from "react";
import { GameSession } from "@/types/game/type";
import {
  GameStatus,
  GameType,
  GAME_STATUS_LABEL,
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
} from "@/lib/constants/game";

type Props = {
  data: GameSession[];
  onRowClick?: (session: GameSession) => void;
};

function StatusBadge({ status }: { status: GameStatus }) {
  const classes = useMemo(() => {
    if (status === GameStatus.NotStarted)
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    if (status === GameStatus.Playing)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }, [status]);
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {GAME_STATUS_LABEL[status]}
    </span>
  );
}

export default function GameTable({ data, onRowClick }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
      <div className="min-w-full overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Players
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Spectators
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  No games yet
                </td>
              </tr>
            ) : (
              data.map((session) => {
                const playersLabel =
                  GAME_TYPE_MAX_PLAYER_NUMBER[session.game_type];
                return (
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
                      {session.current_players}/{playersLabel}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={session.game_status} />
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {session.current_players}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
