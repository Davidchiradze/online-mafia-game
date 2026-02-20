"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinAsSpectator } from "@/lib/spectators/actions";
import { SPECTATOR } from "@/lib/constants/game";

type Props = {
  gameId: string;
  currentSpectatorCount: number;
};

/**
 * Prompt shown when a user navigates to a game that's already in progress.
 * Allows them to join as a spectator (view-only mode).
 * Rendered at the page level before GameRoomProvider is mounted.
 */
export default function SpectatorJoinPrompt({
  gameId,
  currentSpectatorCount,
}: Props) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSlots =
    SPECTATOR.MAX_SPECTATORS_PER_GAME - currentSpectatorCount;
  const isFull = availableSlots <= 0;

  const handleJoinAsSpectator = async () => {
    if (isJoining || isFull) return;

    setIsJoining(true);
    setError(null);

    try {
      const result = await joinAsSpectator(gameId);

      if (!result.ok) {
        setError(result.message);
        setIsJoining(false);
        return;
      }

      // Successfully joined - refresh the page to re-run server component
      // This will now find the spectator record and render the game room
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join as spectator");
      setIsJoining(false);
    }
  };

  const handleGoBack = () => {
    router.push("/lobby");
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Game in Progress
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This game has already started. Would you like to join as a spectator?
          </p>

          {/* Spectator slots info */}
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isFull ? (
                <span className="text-red-600 dark:text-red-400">
                  Spectator slots are full ({SPECTATOR.MAX_SPECTATORS_PER_GAME}/
                  {SPECTATOR.MAX_SPECTATORS_PER_GAME})
                </span>
              ) : (
                <>
                  <span className="font-medium">{availableSlots}</span> of{" "}
                  <span className="font-medium">
                    {SPECTATOR.MAX_SPECTATORS_PER_GAME}
                  </span>{" "}
                  spectator slots available
                </>
              )}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Spectator info */}
          <div className="text-left bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              As a spectator, you will:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Watch all day phase activities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                See player discussions and voting
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">○</span>
                Night phases will be hidden (like dead players)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">✗</span>
                Cannot participate or interact
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGoBack}
              disabled={isJoining}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Back to Lobby
            </button>
            <button
              onClick={handleJoinAsSpectator}
              disabled={isJoining || isFull}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? "Joining..." : "Join as Spectator"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

