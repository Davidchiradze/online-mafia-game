"use client";

import { useState } from "react";
import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  MoreVerticalIcon,
  UsersIcon,
} from "@/assets/icons";
import { LeaveIcon } from "@livekit/components-react";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";
import FinishGameButton from "@/components/host-controls/FinishGameButton";

type FloatingOptionsProps = {
  gameId: string;
  isHost: boolean;
  /** Whether the game can be finished (e.g., not already finished) */
  canFinishGame: boolean;
  onLeaveRoom: () => void;
  /** Custom label for the leave button (default: "Leave room") */
  leaveLabel?: string;
};

export default function FloatingOptions({
  gameId,
  isHost,
  canFinishGame,
  onLeaveRoom,
  leaveLabel = "Leave room",
}: FloatingOptionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {menuOpen && (
          <div className="flex flex-col items-end gap-2">
            {isHost && (
              <>
                {canFinishGame && <FinishGameButton gameId={gameId} />}
                <button
                  type="button"
                  aria-label="Manage join requests"
                  title="Manage join requests"
                  onClick={() => setIsDrawerOpen(true)}
                  className="rounded-full border border-white/10 bg-black/40 backdrop-blur p-3 text-white hover:bg-black/50 transition"
                >
                  <UsersIcon width={20} height={20} />
                </button>
              </>
            )}

            <button
              type="button"
              aria-label={leaveLabel}
              title={leaveLabel}
              onClick={onLeaveRoom}
              className="rounded-full border border-white/10 bg-black/40 backdrop-blur p-3 text-white hover:bg-black/50 transition"
            >
              <LeaveIcon />
            </button>
          </div>
        )}

        <button
          type="button"
          aria-label={menuOpen ? "Hide options" : "Show options"}
          title={menuOpen ? "Hide options" : "Show options"}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full border border-white/10 bg-black/40 backdrop-blur p-3 text-white hover:bg-black/50 transition"
        >
          <MoreVerticalIcon width={20} height={20} />
        </button>
      </div>

      {isHost && (
        <JoinRequestsDrawer
          gameId={gameId}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}
    </div>
  );
}
