import React, { useMemo, useState } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
const HostControls = ({
  gameId,
  maxPlayers,
  tracks,
}: {
  gameId: string;
  maxPlayers: number;
  tracks: TrackReferenceOrPlaceholder[];
}) => {
  const [starting, setStarting] = useState(false);
  const { startGame, gameSessionState } = useGameRoom();
  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const nonHostTracks = tracks.filter(
      (t) => !(t as any)?.participant?.isLocal
    );
    const total = nonHostTracks.length;
    const ready = nonHostTracks.filter((t) => {
      const p: any = (t as any)?.participant;
      try {
        return Boolean(JSON.parse(p?.metadata || "{}")?.ready);
      } catch (_e) {
        return false;
      }
    }).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady: total >= maxPlayers && ready >= maxPlayers,
    };
  }, [tracks]);

  const handleStartGame = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await startGame();
      if (!res?.ok) {
        console.error("Failed to start game:", res?.message);
      }
    } finally {
      setStarting(false);
    }
  };
  return (
    <div className="w-full h-full flex items-center justify-center">
      {allReady ? (
        <button
          type="button"
          className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          disabled={starting}
          onClick={handleStartGame}
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
      ) : (
        <div className="text-xs text-gray-300/80">
          {readyCount}/{Math.max(maxPlayers, totalPlayers)} ready
        </div>
      )}
    </div>
  );
};

export default HostControls;
