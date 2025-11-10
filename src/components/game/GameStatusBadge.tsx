"use client";

import { useMemo } from "react";
import { GameRoom } from "@/types/game/type";

export default function GameStatusBadge({
  status,
}: {
  status: GameRoom["game_status"];
}) {
  const classes = useMemo(() => {
    if (status === "not_started")
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    if (status === "playing")
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }, [status]);
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}
