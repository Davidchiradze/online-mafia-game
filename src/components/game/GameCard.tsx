"use client";

import { GameRoom } from "@/types/game/type";
import {
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
} from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import ClickableTooltip from "@/components/ui/ClickableTooltip";
import { InfoIcon, SkullIcon } from "@/assets/icons";

type Props = {
  session: GameRoom;
  onClick?: (session: GameRoom) => void;
};

export default function GameCard({ session, onClick }: Props) {
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[session.game_type];
  const players = session.players;
  const spectators = session.spectators ?? [];
  const playerCount = players.length;
  const spectatorCount = spectators.length;

  return (
    <button
      type="button"
      onClick={() => onClick?.(session)}
      className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          {session.name}
        </h4>
        <GameStatusBadge status={session.game_status} />
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        {GAME_TYPE_LABEL[session.game_type]}
      </div>

      <div className="flex items-center justify-between text-sm">
        {/* Players */}
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <span>
            Players: {playerCount}/{maxPlayers}
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
                    {players.map((p, idx) => (
                      <li
                        key={p.player_id ?? idx}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <span
                          className={`flex-1 truncate ${
                            p.is_alive === false
                              ? "text-gray-400 dark:text-gray-500 line-through"
                              : ""
                          }`}
                        >
                          {p.nickname ?? "Player"}
                        </span>
                        {p.is_alive === false && (
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

        {/* Spectators */}
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span>Spectators: {spectatorCount}</span>
          {spectators.length > 0 && (
            <ClickableTooltip
              content={
                <div>
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <span className="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Spectators ({spectatorCount})
                    </span>
                  </div>
                  <ul className="max-h-48 overflow-auto py-1">
                    {spectators.map((s, idx) => (
                      <li
                        key={s.user_id ?? idx}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <span className="flex-1 truncate">
                          {s.nickname ?? "Spectator"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              }
              side="bottom"
              align="end"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                <InfoIcon size={12} className="text-gray-500 dark:text-gray-400" />
              </span>
            </ClickableTooltip>
          )}
        </div>
      </div>
    </button>
  );
}
