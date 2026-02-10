"use client";

import React, { useMemo, useState } from "react";
import { startGame, createGameSession } from "@/lib/gameSession/actions";
import { useTracks } from "@livekit/components-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { Track } from "livekit-client";
import PhaseButton from "@/components/ui/PhaseButton";
import PhaseTitle from "@/components/ui/PhaseTitle";

/**
 * Button to start the game session.
 * Shows ready count when not all players are ready.
 * Shows title + "Start" button when everyone is ready.
 */
const StartGameButton = () => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  const maxPlayers = 2;
  const { gameId } = useGameRoom();

  const [isLoading, setIsLoading] = useState(false);
  const { readyCount, allReady } = useMemo(() => {
    const nonHostTracks = tracks.filter((t) => !t?.participant?.isLocal);
    const total = nonHostTracks.length;
    const ready = nonHostTracks.filter((t) => {
      const p = t?.participant;
      try {
        return Boolean(JSON.parse(p?.metadata || "{}")?.ready);
      } catch {
        return false;
      }
    }).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady:
        maxPlayers !== null && total >= maxPlayers && ready >= maxPlayers,
    };
  }, [tracks, maxPlayers]);

  const handleStartGame = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await startGame(gameId);
      if (!res?.ok) {
        console.error("Failed to start game:", res?.message);
        return;
      }

      const sessionRes = await createGameSession(gameId);
      if (!sessionRes?.ok) {
        console.error("Failed to create game session:", sessionRes?.message);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return allReady ? (
    <div className="flex flex-col items-center gap-2">
      <PhaseTitle title="Ready to Play" />
      <PhaseButton onClick={handleStartGame} isLoading={isLoading} label="Start" />
    </div>
  ) : (
    <div className="text-xs text-white/50">
      {readyCount}/{maxPlayers} ready
    </div>
  );
};

export default StartGameButton;
