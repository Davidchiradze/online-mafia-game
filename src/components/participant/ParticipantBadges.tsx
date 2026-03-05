"use client";

import { useState } from "react";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { Tables } from "@/db/supabase/database.types";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "@/lib/constants/game";

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

const MAFIA_ROLE_SET = new Set<string>(MAFIA_TEAM_ROLES);
const YAKUZA_ROLE_SET = new Set<string>(YAKUZA_TEAM_ROLES);

function getRoleColorClass(role: string): string {
  if (MAFIA_ROLE_SET.has(role))
    return "text-red-300 bg-red-950/60 ring-1 ring-red-500/30";
  if (YAKUZA_ROLE_SET.has(role))
    return "text-purple-300 bg-purple-950/60 ring-1 ring-purple-500/30";
  return "text-sky-300 bg-sky-950/60 ring-1 ring-sky-500/30";
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
  const { getRoleForUser, playerRolesMap, maxPlayers } = useGameRoom();
  const [showName, setShowName] = useState(false);

  const playerRole = playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;

  const isMuted = !isMicEnabled;
  const isActiveSpeaker = isSpeaking || isFoulSpeaking;
  const isGameActive = !!gameSessionState && !gameSessionState.is_finished;

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
    !gameSessionState ||
    gameSessionState?.is_finished ||
    (isLocal && isTargetHost);

  const seatBadgeClass = showNominationEffect
    ? "bg-red-700/50 border-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"
    : isTargetHost
      ? "bg-yellow-600/40 border-yellow-500/60 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
      : "bg-black/70 border-white/20";

  const seatNumberClass = showNominationEffect
    ? "text-red-300"
    : isTargetHost
      ? "text-yellow-200"
      : "text-white/90";

  const resolvedName =
    playerIndex === 13 ? "Host" : displayName || `Player ${playerIndex}`;

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
                <MicOffIcon
                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${micIconClass}`}
                />
              ) : (
                <MicOnIcon
                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${micIconClass}`}
                />
              )}
            </button>
          ) : (
            <div
              className={`px-1.5 py-1 rounded-md backdrop-blur-md flex items-center gap-1.5 transition-all ${micContainerClass}`}
            >
              {isMuted ? (
                <MicOffIcon
                  className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${micIconClass}`}
                />
              ) : (
                <MicOnIcon
                  className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${micIconClass}`}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div
          className="px-2 py-1.5 lg:px-3 lg:py-2 group cursor-pointer bg-gradient-to-t from-black/50 to-transparent shadow-[inset_0_-4px_8px_-2px_rgba(0,0,0,0.4)]"
          onMouseEnter={() => isGameActive && setShowName(true)}
          onMouseLeave={() => isGameActive && setShowName(false)}
          onClick={() => isGameActive && setShowName((v) => !v)}
        >
          <div className="flex items-center gap-1.5 lg:gap-2">
            {/* Seat number badge */}
            <div
              className={`p-1 lg:w-6 lg:h-6 rounded-md flex items-center justify-center shrink-0 transition-all border ${seatBadgeClass}`}
            >
              <span
                className={`font-orbitron text-[0.6rem] lg:text-[0.7rem] font-bold ${seatNumberClass}`}
              >
                {playerIndex === (maxPlayers ?? 13) + 1 ? "H" : playerIndex}
              </span>
            </div>

            {/* Player name — always visible when game is not active; reveal on hover/tap during game */}
            <span
              className={`font-inter flex-1 truncate text-[0.7rem] lg:text-[0.8rem] transition-all duration-200 ${
                isSpeaking
                  ? "text-white font-semibold"
                  : "text-white/95 font-medium"
              } ${isGameActive && !showName ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
            >
              {resolvedName}
            </span>

            {/* Role label — colour-coded by faction */}
            {playerRole && (
              <span
                className={`font-inter text-[9px] lg:text-[11px] font-medium shrink-0 px-1.5 py-0.5 rounded ${getRoleColorClass(playerRole)}`}
              >
                {formatRole(playerRole)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
