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

type FloatingOptionsProps = {
  gameId: string;
  isHost: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onLeaveRoom: () => void;
};

export default function FloatingOptions({
  gameId,
  isHost,
  isFullscreen,
  onToggleFullscreen,
  onLeaveRoom,
}: FloatingOptionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className=" fixed bottom-6 right-6 z-40">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {menuOpen && (
          <div className="flex flex-col items-end gap-2">
            {isHost && (
              <button
                type="button"
                aria-label="Manage join requests"
                title="Manage join requests"
                onClick={() => setIsDrawerOpen(true)}
                className="rounded-full border border-white/10 bg-black/40 backdrop-blur p-3 text-white hover:bg-black/50 transition"
              >
                <UsersIcon width={20} height={20} />
              </button>
            )}
            <button
              type="button"
              aria-label={
                isFullscreen ? "Exit full screen" : "Enter full screen"
              }
              title={isFullscreen ? "Exit full screen" : "Enter full screen"}
              onClick={onToggleFullscreen}
              className="rounded-full border border-white/10 bg-black/40 backdrop-blur p-3 text-white hover:bg-black/50 transition"
            >
              {isFullscreen ? (
                <FullscreenExitIcon width={20} height={20} />
              ) : (
                <FullscreenEnterIcon width={20} height={20} />
              )}
            </button>
            <button
              type="button"
              aria-label="Leave room"
              title="Leave room"
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
