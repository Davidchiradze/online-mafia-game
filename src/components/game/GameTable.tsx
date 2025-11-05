"use client";

import { GameSession } from "@/types/game/type";
import GameTableRow from "./GameTableRow";
import GameCard from "./GameCard";

type Props = {
  data: GameSession[];
  onRowClick?: (session: GameSession) => void;
};

export default function GameTable({ data, onRowClick }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
      {/* Mobile: grid of cards */}
      <div className="p-4 md:hidden">
        {data.length === 0 ? (
          <div className="px-2 py-8 text-center text-gray-500 dark:text-gray-400">
            No games yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.map((session) => {
              return (
                <GameCard
                  key={session.id}
                  session={session}
                  onClick={onRowClick}
                  participantCount={session.current_players}
                  participantNames={session?.participant_names || []}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="min-w-full overflow-x-auto hidden md:block">
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
                return (
                  <GameTableRow
                    key={session.id}
                    session={session}
                    onRowClick={onRowClick}
                    participantCount={session.current_players}
                    participantNames={session?.participant_names || []}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
