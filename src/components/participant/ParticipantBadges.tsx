"use client";

import { Track } from "livekit-client";
import { TrackToggle } from "@livekit/components-react";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { Tables } from "@/db/supabase/database.types";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface ParticipantBadgesProps {
  gameSessionState: Tables<"game_sessions"> | null;
  isLocal: boolean;
  isTargetHost: boolean;
  isMicEnabled: boolean;
  playerIndex: number;
  displayName?: string;
  showNominationEffect: boolean;
  playerId: string;
  isViewerHost: boolean;
}

/**
 * ParticipantBadges - Displays microphone indicator and seat number/name badge.
 */
export default function ParticipantBadges({
  gameSessionState,
  isLocal,
  isTargetHost,
  isMicEnabled,
  playerIndex,
  displayName,
  showNominationEffect,
  playerId,
  isViewerHost,
}: ParticipantBadgesProps) {
  const { getRoleForUser, playerRolesMap } = useGameRoom();

  // Get role for this player - only show to host
  const playerRole =
    isViewerHost && playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;

  // Format role for display (capitalize first letter, replace underscores)
  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      {/* Microphone indicator */}
      {(!gameSessionState || (isLocal && isTargetHost)) &&
        (isLocal ? (
          <div className="absolute left-1 top-1 z-10 scale-60 lg:scale-100">
            <TrackToggle source={Track.Source.Microphone} showIcon={true} />
          </div>
        ) : (
          <div className="absolute left-1 top-1 lg:left-2 lg:top-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-1 py-0.5 lg:px-2 lg:py-1 text-white">
            {isMicEnabled ? (
              <MicOnIcon className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />
            ) : (
              <MicOffIcon className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5" />
            )}
          </div>
        ))}

      {/* Seat number / Display name badge */}
      <div
        className={`absolute bottom-1 left-1 lg:bottom-2 lg:left-2 z-10 rounded-full border backdrop-blur px-1.5 py-0.5 lg:px-3 lg:py-1 text-[9px] lg:text-xs font-medium transition-all duration-200 ${
          showNominationEffect
            ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/50 nomination-badge"
            : "border-white/10 bg-black/40 text-gray-100"
        }`}
      >
        <span className="flex items-center gap-1">
          <span>
            {gameSessionState
              ? playerIndex === 13
                ? "Host"
                : playerIndex
              : displayName || (playerIndex === 13 ? "Host" : playerIndex)}
          </span>
          {playerRole && playerIndex !== 13 && (
            <span className="text-[7px] lg:text-[9px] opacity-70 font-normal">
              {formatRole(playerRole)}
            </span>
          )}
        </span>
      </div>
    </>
  );
}
