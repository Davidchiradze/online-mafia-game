"use client";

import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { Tables } from "@/db/supabase/database.types";
import { useGameRoom } from "@/lib/context/gameRoomContext";

interface ParticipantBadgesProps {
  gameSessionState: Tables<"game_sessions"> | null;
  isLocal: boolean;
  isTargetHost: boolean;
  isMicEnabled: boolean;
  isSpeaking: boolean;
  isFoulSpeaking: boolean;
  playerIndex: number;
  displayName?: string;
  showNominationEffect: boolean;
  playerId: string;
  isViewerHost: boolean;
  onToggleMic?: () => void;
}

/**
 * ParticipantBadges - Displays microphone indicator and seat number/name badge.
 */
export default function ParticipantBadges({
  gameSessionState,
  isLocal,
  isTargetHost,
  isMicEnabled,
  isSpeaking,
  isFoulSpeaking,
  playerIndex,
  displayName,
  showNominationEffect,
  playerId,
  isViewerHost,
  onToggleMic,
}: ParticipantBadgesProps) {
  const { getRoleForUser, playerRolesMap } = useGameRoom();

  const playerRole =
     playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isMuted = !isMicEnabled;
  const isActiveSpeaker = isSpeaking || isFoulSpeaking;

  const micContainerClass = isMuted
    ? "bg-red-950/40 border border-red-500/30"
    : isActiveSpeaker
      ? "bg-red-950/50 border border-red-500/40"
      : "bg-black/40 border border-white/10";

  const micIconClass = isMuted
    ? "text-red-400"
    : isActiveSpeaker
      ? "text-red-400"
      : "text-white/60";

  const showMic =
    !gameSessionState || gameSessionState?.is_finished || (isLocal && isTargetHost);

  return (
    <>
      {/* Microphone indicator */}
      {showMic && (
        <div className="absolute left-1 top-1 lg:left-3 lg:top-3 z-20">
          {isLocal ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMic?.();
              }}
              className={`px-2.5 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-white/20 hover:ring-white/40 hover:brightness-125 active:scale-95 ${micContainerClass}`}
            >
              {isMuted ? (
                <MicOffIcon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${micIconClass}`} />
              ) : (
                <MicOnIcon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${micIconClass}`} />
              )}
            </button>
          ) : (
            <div
              className={`px-1.5 py-1 rounded-md backdrop-blur-md flex items-center gap-1.5 transition-all ${micContainerClass}`}
            >
              {isMuted ? (
                <MicOffIcon className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${micIconClass}`} />
              ) : (
                <MicOnIcon className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${micIconClass}`} />
              )}
            </div>
          )}
        </div>
      )}

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
          {playerRole  && (
            <span className="text-[7px] lg:text-[9px] opacity-70 font-normal">
              {formatRole(playerRole)}
            </span>
          )}
        </span>
      </div>
    </>
  );
}
