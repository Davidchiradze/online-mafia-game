"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type EndGameControlsProps = {
  gameId: string;
};

/**
 * Controls displayed when the game has ended
 */
const EndGameControls = ({ gameId }: EndGameControlsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReturnToLobby = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Clean up game session and reset game status
      // For now, just redirect to lobby
      router.push("/lobby");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-semibold text-gray-200">Game Finished</div>
      <button
        type="button"
        className="rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
        disabled={isLoading}
        onClick={handleReturnToLobby}
      >
        {isLoading ? "Returning..." : "Return to Lobby"}
      </button>
    </div>
  );
};

export default EndGameControls;
