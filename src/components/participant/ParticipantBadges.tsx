"use client";

import { useTranslations } from "next-intl";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import ParticipantRoleBadge from "./ParticipantRoleBadge";
import SeatIndicator from "./SeatIndicator";
import {
  MicToggleButton,
  MicIndicator,
  CameraToggleButton,
} from "./mediaControls";

type GameSessionState = NonNullable<
  ReturnType<typeof useGameRoom>["gameSessionState"]
>;

interface ParticipantBadgesProps {
  gameSessionState: GameSessionState | null;
  isLocal: boolean;
  isTargetHost: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  /** Whether to render the local player's camera toggle (hidden when dead). */
  showCameraToggle: boolean;
  isSpeaking: boolean;
  isFoulSpeaking: boolean;
  playerIndex: number;
  displayName?: string;
  showNominationEffect: boolean;
  playerId: string;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
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
  isCameraEnabled,
  showCameraToggle,
  isSpeaking,
  isFoulSpeaking,
  playerIndex,
  displayName,
  showNominationEffect,
  playerId,
  onToggleMic,
  onToggleCamera,
  speakingProgress = 0,
}: ParticipantBadgesProps) {
  const { getRoleForUser, playerRolesMap, maxPlayers } = useGameRoom();
  const tg = useTranslations("game");

  const playerRole = playerRolesMap.size > 0 ? getRoleForUser(playerId) : null;
  const gameFinished = !!gameSessionState?.isFinished;

  const isMuted = !isMicEnabled;
  const isActiveSpeaker = isSpeaking || isFoulSpeaking;
  const isGameActive = !!gameSessionState && !gameSessionState.isFinished;

  const micContainerClass = isMuted
    ? "bg-red-950/60 border border-red-500/30"
    : isActiveSpeaker
      ? "bg-red-950/65 border border-red-500/40"
      : "bg-black/60 border border-white/10";

  const micIconClass = isMuted
    ? "text-red-400"
    : isActiveSpeaker
      ? "text-red-400"
      : "text-white/60";

  const cameraOff = !isCameraEnabled;
  const cameraContainerClass = cameraOff
    ? "bg-red-950/60 border border-red-500/30"
    : "bg-black/60 border border-white/10";
  const cameraIconClass = cameraOff ? "text-red-400" : "text-white/60";

  const showMic =
    !gameSessionState ||
    gameSessionState?.isFinished ||
    (isLocal && isTargetHost);

  const resolvedName = displayName;

  return (
    <>
      {/* Microphone + camera controls — stacked vertically at the top-left.
          The camera toggle sits below the mic; when the mic is hidden during an
          active game it rises into the top-left slot on its own. */}
      {(showMic || showCameraToggle) && (
        <div className="absolute left-1 top-1 tlg:left-3 tlg:top-3 z-20 flex flex-col gap-1 tsm:gap-1.5">
          {showMic &&
            (isLocal ? (
              <MicToggleButton
                isMuted={isMuted}
                containerClass={micContainerClass}
                iconClass={micIconClass}
                onToggle={onToggleMic}
              />
            ) : (
              <MicIndicator
                isMuted={isMuted}
                containerClass={micContainerClass}
                iconClass={micIconClass}
              />
            ))}

          {showCameraToggle && (
            <CameraToggleButton
              cameraOff={cameraOff}
              containerClass={cameraContainerClass}
              iconClass={cameraIconClass}
              label={tg("livekit.toggleCamera")}
              onToggle={onToggleCamera}
            />
          )}
        </div>
      )}

      {/* Player name — top center, hidden during game, revealed on hover (desktop) or tap/focus (mobile) */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none transition duration-300 ${
          isGameActive
            ? "opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
            : "opacity-100"
        }`}
      >
        <div className="px-2 py-0.5 tsm:px-3 tsm:py-1 rounded-b-lg bg-black/75 border border-white/10 border-t-0 shadow-lg max-w-[80%]">
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
