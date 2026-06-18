"use client";

import { useTranslations } from "next-intl";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { JAPANESE_MAFIA_ROLES, MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "@/lib/constants/game";
import SeatIndicator from "./SeatIndicator";

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
  onToggleMic?: () => void;
  /** Active speaker timer progress (0 → 100). 0 when not the speaker. */
  speakingProgress?: number;
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

const KNOWN_ROLES = new Set<string>(JAPANESE_MAFIA_ROLES);

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
  onToggleMic,
  speakingProgress = 0,
}: ParticipantBadgesProps) {
  const tg = useTranslations("game");
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

  const resolvedName = displayName;

  return (
    <>
      {/* Microphone indicator */}
      {showMic && (
        <div className="absolute left-1 top-1 tlg:left-3 tlg:top-3 z-20">
          {isLocal ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMic?.();
              }}
              className={`px-1.5 py-1 tsm:px-2 tsm:py-1.5 tlg:px-2.5 rounded-lg backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-white/20 hover:ring-white/40 hover:brightness-125 active:scale-95 ${micContainerClass}`}
            >
              {isMuted ? (
                <MicOffIcon
                  className={`w-3 h-3 tsm:w-3.5 tsm:h-3.5 tlg:w-4 tlg:h-4 ${micIconClass}`}
                />
              ) : (
                <MicOnIcon
                  className={`w-3 h-3 tsm:w-3.5 tsm:h-3.5 tlg:w-4 tlg:h-4 ${micIconClass}`}
                />
              )}
            </button>
          ) : (
            <div
              className={`px-1 py-0.5 tsm:px-1.5 tsm:py-1 rounded-md backdrop-blur-md flex items-center gap-1.5 transition-all ${micContainerClass}`}
            >
              {isMuted ? (
                <MicOffIcon
                  className={`w-2 h-2 tsm:w-2.5 tsm:h-2.5 tlg:w-3 tlg:h-3 ${micIconClass}`}
                />
              ) : (
                <MicOnIcon
                  className={`w-2 h-2 tsm:w-2.5 tsm:h-2.5 tlg:w-3 tlg:h-3 ${micIconClass}`}
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
        <div className="px-2 py-0.5 tsm:px-3 tsm:py-1 rounded-b-lg backdrop-blur-md bg-black/60 border border-white/10 border-t-0 shadow-lg max-w-[80%]">
          <span
            className={`font-inter text-[0.55rem] tsm:text-[0.65rem] tlg:text-[0.75rem] truncate block text-center ${
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
        <div className="px-1.5 py-1 tsm:px-2 tsm:py-1.5 tlg:px-3 tlg:py-2 bg-gradient-to-t from-black/50 to-transparent shadow-[inset_0_-4px_8px_-2px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-1 tsm:gap-1.5 tlg:gap-2">
            {/* Seat number dial — circular badge wrapped by a speaking
                countdown ring that depletes as the speaker's time runs out. */}
            <SeatIndicator
              label={playerIndex === (maxPlayers ?? 13) + 1 ? "H" : playerIndex}
              showNominationEffect={showNominationEffect}
              isTargetHost={isTargetHost}
              speakingProgress={speakingProgress}
            />

            <div className="flex-1" />

            {/* Role label — colour-coded by faction, pushed to the right */}
            {playerRole && (
              <span
                className={`font-inter text-[7px] tsm:text-[9px] tlg:text-[11px] font-medium shrink-0 px-1 py-0.5 tsm:px-1.5 rounded ${getRoleColorClass(playerRole)}`}
              >
                {KNOWN_ROLES.has(playerRole)
                  ? tg(`roles.${playerRole as (typeof JAPANESE_MAFIA_ROLES)[number]}`)
                  : playerRole}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
