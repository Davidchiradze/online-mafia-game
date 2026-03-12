"use client";

import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "@/lib/constants/game";

type GameSessionState = NonNullable<
  ReturnType<typeof useGameRoom>["gameSessionState"]
>;

interface ParticipantBadgesProps {
  gameSessionState: GameSessionState | null;
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
    return "text-white font-semibold bg-black ring-1 ring-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]";
  if (YAKUZA_ROLE_SET.has(role))
    return "text-white font-semibold bg-purple-600 ring-1 ring-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.4)]";
  return "text-white font-semibold bg-red-600 ring-1 ring-red-400/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * ParticipantBadges - Displays microphone indicator, player name tooltip,
 * seat number badge, foul indicators, and role label.
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

  const playerRole = playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;

  const isMuted = !isMicEnabled;
  const isActiveSpeaker = isSpeaking || isFoulSpeaking;
  const isGameActive = !!gameSessionState && !gameSessionState.isFinished;

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
    gameSessionState?.isFinished ||
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

  const resolvedName = displayName;

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

      {/* Player name — top center, hidden during game, revealed on hover (desktop) or tap/focus (mobile) */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none transition-all duration-300 ${
          isGameActive
            ? "opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
            : "opacity-100"
        }`}
      >
        <div className="px-3 py-1 rounded-b-lg backdrop-blur-md bg-black/60 border border-white/10 border-t-0 shadow-lg max-w-[80%]">
          <span
            className={`font-inter text-[0.65rem] lg:text-[0.75rem] truncate block text-center ${
              isSpeaking
                ? "text-white font-semibold"
                : "text-white/90 font-medium"
            }`}
          >
            {resolvedName}
          </span>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="px-2 py-1.5 lg:px-3 lg:py-2 bg-gradient-to-t from-black/50 to-transparent shadow-[inset_0_-4px_8px_-2px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1.5 lg:gap-2">
            {/* Seat number badge */}
            <div
              className={`w-5 h-5 lg:w-6 lg:h-6 aspect-square rounded-md flex items-center justify-center shrink-0 transition-all border ${seatBadgeClass}`}
            >
              <span
                className={`font-orbitron text-[0.55rem] lg:text-[0.7rem] font-bold leading-none ${seatNumberClass}`}
              >
                {playerIndex === (maxPlayers ?? 13) + 1 ? "H" : playerIndex}
              </span>
            </div>

            <div className="flex-1" />

            {/* Role label — colour-coded by faction, pushed to the right */}
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
