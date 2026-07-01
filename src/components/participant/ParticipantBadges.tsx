"use client";

import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import ParticipantRoleBadge from "./ParticipantRoleBadge";
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
  const { getRoleForUser, playerRolesMap, maxPlayers } = useGameRoom();

  const playerRole = playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;
  const gameFinished = !!gameSessionState?.isFinished;

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

            {/* Role label — hidden by default, revealed by the local player */}
            <ParticipantRoleBadge
              playerRole={playerRole}
              isLocal={isLocal}
              gameFinished={gameFinished}
            />
          </div>
        </div>
      </div>
    </>
  );
}
