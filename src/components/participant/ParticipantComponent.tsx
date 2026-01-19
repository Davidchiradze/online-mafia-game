"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { useCallback } from "react";
import { Tables } from "@/db/supabase/database.types";

// Context
import { useGameRoom } from "@/lib/context/gameRoomContext";

// Hooks
import {
  useParticipantReady,
  useParticipantVisibility,
  useParticipantState,
  useParticipantMenuActions,
  useParticipantKill,
  useMobileReady,
  useParticipantSpeaking,
} from "@/hooks/participant";
import {
  useNomination,
  useFoulSpeak,
  useSpeakingProgress,
  useMafiaTargetSelection,
} from "@/hooks/game";

// Components
import { VisibilityState } from "@/lib/game/visibility";
import ParticipantCover from "@/components/video/ParticipantCover";
import ReadyButton from "@/components/ui/ReadyButton";
import NominationButton from "@/components/game/NominationButton";
import FoulButton from "@/components/game/FoulButton";
import FoulSpeakButton from "@/components/game/FoulSpeakButton";
import FoulDisplay from "@/components/game/FoulDisplay";
import MafiaKillButton from "@/components/game/MafiaKillButton";
import ParticipantMenuButton from "./ParticipantMenuButton";
import KillConfirmModal from "./KillConfirmModal";
import MafiaTargetIndicator from "./MafiaTargetIndicator";
import SpeakingProgressBar from "./SpeakingProgressBar";

export default function ParticipantComponent({
  gameId,
  hostUserId,
  currentUserId,
  trackRef,
  playerIndex,
  player,
}: {
  gameId: string;
  hostUserId: string | null;
  currentUserId: string;
  trackRef: TrackReferenceOrPlaceholder | undefined;
  playerIndex: number;
  player: Tables<"game_players">;
}) {
  const { gameSessionState, room } = useGameRoom();

  // Basic participant state
  const {
    isLocal,
    isMicEnabled,
    displayName,
    participantId,
    isViewerHost,
    isTargetHost,
    isDisconnected,
  } = useParticipantState(trackRef, player, currentUserId, hostUserId);

  // Ready state
  const {
    isReady,
    markReady,
    markUnready,
    isLoading: isLoadingReady,
  } = useParticipantReady(gameId, participantId, trackRef);

  // Visibility state
  const { visibilityState, coverMessage, isTargetDead } =
    useParticipantVisibility(trackRef, player);

  // Menu actions (kick, make host)
  const {
    menuOpen,
    setMenuOpen,
    canShowLobbyMenu,
    canShowGameMenu,
    onKick,
    onMakeHost,
  } = useParticipantMenuActions(
    gameId,
    participantId,
    hostUserId,
    isViewerHost,
    gameSessionState,
    player.is_alive !== false
  );

  // Kill actions
  const {
    killModalOpen,
    setKillModalOpen,
    isKilling,
    onKillClick,
    onConfirmKill,
  } = useParticipantKill(gameId, participantId, setMenuOpen);

  // Mobile ready visibility
  const { isMobileReadyVisible, handleTileClick } = useMobileReady(
    isLocal,
    isTargetHost
  );

  // Nomination state
  const {
    isNominated,
    showNominationEffect,
    canShowNominationButton,
    isDayPhase,
  } = useNomination({
    seatNumber: player.seat_number,
    isViewerHost,
    isTargetHost,
  });

  // Speaking state
  const { isSpeaking, boxShadowClass } = useParticipantSpeaking(
    gameSessionState,
    player.seat_number,
    isMicEnabled,
    isDayPhase,
    isTargetHost,
    isTargetDead
  );

  // Speaking progress
  const speakingProgress = useSpeakingProgress(
    gameSessionState?.speaker_started_at,
    isSpeaking
  );

  // Foul-related functionality
  const {
    isFoulSpeaking,
    foulSpeakTimeLeft,
    startFoulSpeak,
    canFoulSpeak,
    canShowFoulSpeakButton,
    currentFouls,
    canShowFoulButton,
  } = useFoulSpeak({
    room,
    player,
    isLocal,
    isDayPhase,
    isSpeaking,
    isTargetHost,
    isViewerHost,
  });

  // Mafia target selection
  const {
    isMafiaTargetSelected,
    shouldShowMafiaTargetIndicator,
    canShowMafiaKillButton,
  } = useMafiaTargetSelection(
    gameSessionState,
    player.seat_number,
    isViewerHost,
    isTargetHost,
    player.is_alive !== false
  );

  // Ready button handlers
  const onReady = useCallback(async () => {
    await markReady();
  }, [markReady]);

  const onUnready = useCallback(async () => {
    await markUnready();
  }, [markUnready]);

  return (
    <div
      className={`relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-200 group transition-shadow duration-300 overflow-hidden rounded-xl ${boxShadowClass}`}
      onMouseLeave={() => setMenuOpen(false)}
      onClick={handleTileClick}
    >
      {/* Video / Cover layer */}
      {visibilityState === VisibilityState.DEAD ? (
        <ParticipantCover isDead={true} />
      ) : isDisconnected ? (
        <ParticipantCover isDisconnected={true} />
      ) : visibilityState === VisibilityState.COVERED || !trackRef ? (
        <ParticipantCover message={coverMessage} />
      ) : (
        <div className="relative w-full h-full">
          <ParticipantTile
            className="lk-hide-metadata"
            trackRef={trackRef}
            style={{ height: "100%" }}
          />
          {visibilityState === VisibilityState.DIMMED && (
            <div className="absolute inset-0 z-[5] pointer-events-none">
              <div className="absolute inset-0 backdrop-blur-sm bg-slate-900/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl md:text-5xl opacity-80 animate-pulse">
                  💤
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Microphone indicator */}
      {(!gameSessionState || (isLocal && isTargetHost)) &&
        (isLocal ? (
          <div className="absolute left-1 top-1 md:left-2 md:top-2 z-10 scale-90 md:scale-100">
            <TrackToggle source={Track.Source.Microphone} showIcon={true} />
          </div>
        ) : (
          <div className="absolute left-1 top-1 md:left-2 md:top-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-1.5 py-0.5 md:px-2 md:py-1 text-white text-[10px] md:text-[12px]">
            {isMicEnabled ? (
              <MicOnIcon width={14} height={14} />
            ) : (
              <MicOffIcon width={14} height={14} />
            )}
          </div>
        ))}

      {/* Seat number / Display name badge */}
      <div
        className={`absolute bottom-1 left-1 md:bottom-2 md:left-2 z-10 rounded-full border backdrop-blur px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-medium transition-all duration-200 ${
          showNominationEffect
            ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/50 nomination-badge"
            : "border-white/10 bg-black/40 text-gray-100"
        }`}
      >
        {gameSessionState
          ? playerIndex === 13
            ? "Host"
            : playerIndex
          : displayName || (playerIndex === 13 ? "Host" : playerIndex)}
      </div>

      {/* Lobby menu - kick/make host */}
      {canShowLobbyMenu && (
        <ParticipantMenuButton
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((p) => !p)}
          onCloseMenu={() => setMenuOpen(false)}
          items={[
            {
              label: "Kick player",
              onClick: onKick,
              className: "text-red-600 dark:text-red-400",
            },
            { label: "Make host", onClick: onMakeHost },
          ]}
          ariaLabel="Participant settings"
        />
      )}

      {/* Game menu - kill action */}
      {canShowGameMenu && (
        <ParticipantMenuButton
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((p) => !p)}
          onCloseMenu={() => setMenuOpen(false)}
          items={[
            {
              label: "Kill",
              onClick: onKillClick,
              className: "text-red-600 dark:text-red-400",
            },
          ]}
          ariaLabel="Player actions"
        />
      )}

      {/* Kill confirmation modal */}
      <KillConfirmModal
        open={killModalOpen}
        onClose={() => setKillModalOpen(false)}
        onConfirm={onConfirmKill}
        isKilling={isKilling}
        seatNumber={player.seat_number}
      />

      {/* Ready indicator */}
      {!gameSessionState && isReady && (
        <div className="absolute right-1 top-[34px] md:right-2 md:top-2 z-20 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] md:text-xs font-bold shadow">
          ✓
        </div>
      )}

      {/* Nomination button */}
      {canShowNominationButton &&
        player.seat_number != null &&
        !isTargetDead && (
          <div className="absolute left-[30px] -translate-x-1/2 top-1 md:top-2 z-20">
            <NominationButton
              seatNumber={player.seat_number}
              isNominated={isNominated}
            />
          </div>
        )}

      {/* Foul button */}
      {canShowFoulButton && player.seat_number != null && !isTargetDead && (
        <div className="absolute right-[0px] -translate-x-1/2 top-1 md:top-2 z-20">
          <FoulButton
            seatNumber={player.seat_number}
            currentFouls={currentFouls}
          />
        </div>
      )}

      {/* Foul display */}
      {!isTargetDead && <FoulDisplay foulCount={currentFouls} />}

      {/* Mafia kill button */}
      {canShowMafiaKillButton && player.seat_number != null && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <MafiaKillButton
              seatNumber={player.seat_number}
              isSelected={isMafiaTargetSelected}
            />
          </div>
        </div>
      )}

      {/* Mafia target indicator for host */}
      {shouldShowMafiaTargetIndicator &&
        !canShowMafiaKillButton &&
        player.seat_number != null && <MafiaTargetIndicator />}

      {/* Ready button */}
      {isLocal && !isTargetHost && !gameSessionState && (
        <div className="flex items-center justify-center absolute bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 z-20">
          <ReadyButton
            isReady={isReady}
            onReady={onReady}
            onUnready={onUnready}
            disabled={isLoadingReady}
            className={`${
              isMobileReadyVisible ? "flex" : "hidden"
            } md:group-hover:flex flex items-center justify-center`}
          />
        </div>
      )}

      {/* Foul speak button */}
      {canShowFoulSpeakButton && !isTargetDead && (
        <div className="absolute right-1 top-1 md:right-2 md:top-2 z-20">
          <FoulSpeakButton
            onStartFoulSpeak={startFoulSpeak}
            isFoulSpeaking={isFoulSpeaking}
            foulSpeakTimeLeft={foulSpeakTimeLeft}
            canFoulSpeak={canFoulSpeak}
          />
        </div>
      )}

      {/* Speaking progress bar */}
      {isSpeaking && !isTargetDead && (
        <SpeakingProgressBar progress={speakingProgress} />
      )}
    </div>
  );
}
