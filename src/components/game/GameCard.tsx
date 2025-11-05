"use client";

import { GameSession } from "@/types/game/type";
import {
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
} from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import Tooltip from "@/components/ui/Tooltip";

type Props = {
  session: GameSession;
  onClick?: (session: GameSession) => void;
  participantCount: number;
  participantNames: string[];
};

export default function GameCard({
  session,
  onClick,
  participantCount,
  participantNames,
}: Props) {
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[session.game_type];

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
        <div className="text-gray-700 dark:text-gray-300">
          Players:
          {participantNames.length > 0 ? (
            <Tooltip
              side="top"
              align="center"
              content={
                <div className="max-h-48 overflow-auto leading-relaxed whitespace-pre-wrap">
                  {participantNames.join(", ")}
                </div>
              }
            >
              <span className="ml-1 underline decoration-dotted underline-offset-4">
                {participantCount}/{maxPlayers}
              </span>
            </Tooltip>
          ) : (
            <span className="ml-1">
              {participantCount}/{maxPlayers}
            </span>
          )}
        </div>

        <div className="text-gray-500 dark:text-gray-400">
          Spectators: {participantCount}
        </div>
      </div>
    </button>
  );
}
