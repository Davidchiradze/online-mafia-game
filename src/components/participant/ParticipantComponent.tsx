"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { useCallback, useMemo } from "react";
import { Tables } from "@/db/supabase/database.types";
import { FOULS } from "@/lib/constants/game";

// Context
import { useGameRoom } from "@/lib/context/gameRoomContext";

// Hooks
import {
  useParticipantReady,
  useParticipantVisibility,
  useParticipantState,
  useParticipantMenuActions,
  useMobileReady,
  useParticipantSpeaking,
} from "@/hooks/participant";
import {
  useNomination,
  useFoulSpeak,
  useSpeakingProgress,
  useMafiaTargetSelection,
  useYakuzaTargetSelection,
  useDoctorHealSelection,
  useVoteIndicator,
} from "@/hooks/game";

// Components
import ReadyButton from "@/components/ui/ReadyButton";
import ParticipantMenuButton from "./ParticipantMenuButton";
import SpeakingProgressBar from "./SpeakingProgressBar";
import ParticipantOverlay from "./ParticipantOverlay";
import ParticipantBadges from "./ParticipantBadges";
import NominationFoulSection from "./NominationFoulSection";
import NightActionButtons from "./NightActionButtons";
import VoteIndicator from "./VoteIndicator";

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
  const { menuOpen, setMenuOpen, canShowLobbyMenu, onKick, onMakeHost } =
    useParticipantMenuActions(
      gameId,
      participantId,
      hostUserId,
      isViewerHost,
      gameSessionState
    );

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

  // Speaking progress (uses different durations based on phase)
  const speakingProgress = useSpeakingProgress(
    gameSessionState?.speaker_started_at,
    isSpeaking,
    gameSessionState?.game_phase
  );

  // Check if current phase allows fouls
  const isFoulAllowedPhase = useMemo(() => {
    const currentPhase = gameSessionState?.game_phase;
    if (!currentPhase) return false;
    return (FOULS.ALLOWED_PHASES as readonly string[]).includes(currentPhase);
  }, [gameSessionState?.game_phase]);

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
    isFoulAllowedPhase,
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

  // Yakuza target selection
  const {
    isYakuzaTargetSelected,
    shouldShowYakuzaTargetIndicator,
    canShowYakuzaKillButton,
  } = useYakuzaTargetSelection(
    gameSessionState,
    player.seat_number,
    isViewerHost,
    isTargetHost,
    player.is_alive !== false
  );

  // Doctor heal selection
  const {
    canShowDoctorHealButton,
    isAlreadyHealed,
    isDoctorHealSelected,
    shouldShowDoctorHealIndicator,
  } = useDoctorHealSelection(
    gameSessionState,
    player.seat_number,
    isViewerHost,
    isTargetHost,
    player.is_alive !== false
  );

  // Vote indicator (voting phase)
  const { showVoteIndicator } = useVoteIndicator(player.seat_number);

  // Ready button handlers
  const onReady = useCallback(async () => {
    await markReady();
  }, [markReady]);

  const onUnready = useCallback(async () => {
    await markUnready();
  }, [markUnready]);

  // Suppress unused variable warning - used for future features
  void isDoctorHealSelected;

  return (
    <div
      className={`relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-200 group transition-shadow duration-300 overflow-hidden rounded-xl ${boxShadowClass}`}
      onMouseLeave={() => setMenuOpen(false)}
      onClick={handleTileClick}
    >
      {/* Video / Cover layer */}
      <ParticipantOverlay
        visibilityState={visibilityState}
        isDisconnected={isDisconnected}
        coverMessage={coverMessage}
        trackRef={trackRef}
      />

      {/* Vote indicator (thumbs up during voting phase) */}
      {showVoteIndicator && <VoteIndicator />}

      {/* Microphone indicator and seat badge */}
      <ParticipantBadges
        gameSessionState={gameSessionState}
        isLocal={isLocal}
        isTargetHost={isTargetHost}
        isMicEnabled={isMicEnabled}
        playerIndex={playerIndex}
        displayName={displayName}
        showNominationEffect={showNominationEffect}
        playerId={player.player_id || ""}
        isViewerHost={isViewerHost}
      />

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

      {/* Ready indicator */}
      {!gameSessionState && isReady && (
        <div className="absolute right-1 top-[34px] md:right-2 md:top-2 z-20 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] md:text-xs font-bold shadow">
          ✓
        </div>
      )}

      {/* Nomination and foul section */}
      <NominationFoulSection
        seatNumber={player.seat_number}
        isTargetDead={isTargetDead}
        canShowNominationButton={canShowNominationButton}
        isNominated={isNominated}
        canShowFoulButton={canShowFoulButton}
        currentFouls={currentFouls}
        canShowFoulSpeakButton={canShowFoulSpeakButton}
        isFoulSpeaking={isFoulSpeaking}
        foulSpeakTimeLeft={foulSpeakTimeLeft}
        canFoulSpeak={canFoulSpeak}
        startFoulSpeak={startFoulSpeak}
      />

      {/* Night action buttons (Mafia kill, Yakuza kill, Doctor heal) */}
      <NightActionButtons
        seatNumber={player.seat_number}
        canShowMafiaKillButton={canShowMafiaKillButton}
        isMafiaTargetSelected={isMafiaTargetSelected}
        shouldShowMafiaTargetIndicator={shouldShowMafiaTargetIndicator}
        canShowYakuzaKillButton={canShowYakuzaKillButton}
        isYakuzaTargetSelected={isYakuzaTargetSelected}
        shouldShowYakuzaTargetIndicator={shouldShowYakuzaTargetIndicator}
        canShowDoctorHealButton={canShowDoctorHealButton}
        isAlreadyHealed={isAlreadyHealed}
        shouldShowDoctorHealIndicator={shouldShowDoctorHealIndicator}
      />

      {/* Ready button */}
      {isLocal && !isTargetHost && !gameSessionState && (
        <div className="flex items-center justify-center absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-20">
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

      {/* Speaking progress bar */}
      {isSpeaking && !isTargetDead && (
        <SpeakingProgressBar progress={speakingProgress} />
      )}
    </div>
  );
}
