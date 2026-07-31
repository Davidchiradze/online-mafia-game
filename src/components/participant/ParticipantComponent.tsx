"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Check } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { FOULS } from "@/shared/lib/constants/game";

// Context
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";

// Hooks
import {
  useParticipantReady,
  useParticipantVisibility,
  useParticipantState,
  useParticipantMenuActions,
  useMobileReady,
  useParticipantSpeaking,
  useParticipantSpeakingBan,
} from "@/hooks/participant";
import {
  useNomination,
  useFoulSpeak,
  useSpeakingProgress,
  useYakuzaTargetSelection,
  useDoctorHealSelection,
  useNightActionAuthority,
  useRightHandPromotion,
  useVoteIndicator,
} from "@/hooks/game";
import { useFoulNotification } from "@/hooks/game/useFoulNotification";

// Components
import ReadyButton from "@/shared/ui/ReadyButton";
import ParticipantMenuButton from "./ParticipantMenuButton";
import ParticipantOverlay from "./ParticipantOverlay";
import ParticipantBadges from "./ParticipantBadges";
import NominationFoulSection from "./NominationFoulSection";
import NightActionButtons from "./NightActionButtons";
import VoteIndicator from "./VoteIndicator";
import { muteParticipantMicrophone } from "@/shared/lib/livekit/actions";

export default function ParticipantComponent({
  gameId,
  hostProfileId,
  currentProfileId,
  trackRef,
  playerIndex,
  player,
}: {
  gameId: string;
  hostProfileId: string | null;
  currentProfileId: string;
  trackRef: TrackReferenceOrPlaceholder | undefined;
  playerIndex: number;
  player: NonNullable<ReturnType<typeof useGameRoom>["players"]>[number];
}) {
  const { gameSessionState, room } = useGameRoom();
  const tg = useTranslations("game");
  const tc = useTranslations("common");

  // Basic participant state
  const {
    isLocal,
    isMicEnabled,
    isCameraEnabled,
    displayName,
    participantId,
    isViewerHost,
    isTargetHost,
  } = useParticipantState(trackRef, player, currentProfileId, hostProfileId);

  // Ready state (backed by the gamePlayers.isReady column in Convex)
  const {
    isReady,
    markReady,
    markUnready,
    isLoading: isLoadingReady,
  } = useParticipantReady(gameId, player.isReady ?? false);

  // Visibility state
  const { visibilityState, isTargetDead } = useParticipantVisibility(
    trackRef,
    player,
  );

  // Menu actions (kick, make host)
  const { menuOpen, setMenuOpen, canShowLobbyMenu, onKick, onMakeHost } =
    useParticipantMenuActions(
      gameId,
      participantId,
      hostProfileId,
      isViewerHost,
      gameSessionState,
    );

  // Mobile ready visibility
  const { isMobileReadyVisible, handleTileClick } = useMobileReady(
    isLocal,
    isTargetHost,
  );

  // Nomination state
  const {
    isNominated,
    showNominationEffect,
    canShowNominationButton,
  } = useNomination({
    seatNumber: player.seatNumber ?? null,
    isViewerHost,
    isTargetHost,
  });

  // Check if current phase allows fouls (needed for speaking state)
  const isFoulAllowedPhase = useMemo(() => {
    const currentPhase = gameSessionState?.gamePhase;
    if (!currentPhase) return false;
    return (FOULS.ALLOWED_PHASES as readonly string[]).includes(currentPhase);
  }, [gameSessionState?.gamePhase]);

  // 3rd-foul speaking ban (Sports §4.2) for this tile, plus the final-day 30s
  // speech override.
  const { isSpeakingBanned, finalDaySpeechMs } =
    useParticipantSpeakingBan(player);

  // Speaking state
  const { isSpeaking, isMutedTurn, isParticipantFoulSpeaking, speakerBorderClass } =
    useParticipantSpeaking(
      gameSessionState,
      player.seatNumber ?? null,
      isMicEnabled,
      isFoulAllowedPhase,
      isTargetHost,
      isTargetDead,
      isSpeakingBanned,
    );
  // Speaking progress (uses different durations based on phase). A muted turn
  // runs no countdown — the host simply clicks Next past them.
  const speakingProgress = useSpeakingProgress(
    gameSessionState?.speakerStartedAt,
    isSpeaking && !isMutedTurn,
    gameSessionState?.gamePhase,
    finalDaySpeechMs,
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
    isFoulAllowedPhase,
    isSpeaking,
    isMutedTurn,
    isTargetHost,
    isViewerHost,
  });

  const showFoulNotification = useFoulNotification(currentFouls);

  // Night action authority (synchronous, derived from context)
  const {
    hasMafiaKillAuthority,
    isMafiaPhase,
    hasYakuzaKillAuthority,
    isYakuzaPhase,
    hasDoctorHealAuthority,
    isDoctorPhase,
  } = useNightActionAuthority();

  const { healedPlayers } = useGameRoom();

  // Yakuza target selection
  const {
    isYakuzaTargetSelected,
    shouldShowYakuzaTargetIndicator,
    canShowYakuzaKillButton,
  } = useYakuzaTargetSelection(
    gameSessionState,
    player.seatNumber ?? null,
    isViewerHost,
    isTargetHost,
    player.isAlive !== false,
    hasYakuzaKillAuthority,
    isYakuzaPhase,
  );

  // Doctor heal selection
  const {
    canShowDoctorHealButton,
    isAlreadyHealed,
    shouldShowDoctorHealIndicator,
  } = useDoctorHealSelection(
    gameSessionState,
    player.seatNumber ?? null,
    isViewerHost,
    isTargetHost,
    player.isAlive !== false,
    hasDoctorHealAuthority,
    isDoctorPhase,
    healedPlayers,
  );

  // Right Hand promotion (Don picks during `don_chooses_right_hand`)
  const { canShowPromoteButton: canShowPromoteRightHandButton } =
    useRightHandPromotion(
      (player.playerId as string | undefined) ?? null,
      isTargetHost,
      player.isAlive !== false,
    );

  // Vote indicator (voting phase)
  const { showVoteIndicator } = useVoteIndicator(player.seatNumber ?? null);

  // Ready button handlers
  const onReady = useCallback(async () => {
    await markReady();
  }, [markReady]);

  const onUnready = useCallback(async () => {
    await markUnready();
  }, [markUnready]);

  const handleMutePlayer = useCallback(async () => {
    if (!room || !player?.playerId) return;

    try {
      await muteParticipantMicrophone(room.name, player.playerId as string, true);
    } catch (error) {
      console.error("Failed to mute participant:", error);
    }
  }, [room, player.playerId]);

  const handleToggleMic = useCallback(() => {
    if (!room) return;
    void room.localParticipant.setMicrophoneEnabled(!isMicEnabled);
  }, [room, isMicEnabled]);

  const handleToggleCamera = useCallback(() => {
    if (!room) return;
    void room.localParticipant.setCameraEnabled(!isCameraEnabled);
  }, [room, isCameraEnabled]);

  // Players can toggle their own camera anytime (lobby + started game),
  // unlike the mic which is gated by speaking order. Hidden only when dead.
  const showCameraToggle = isLocal && !isTargetDead;

  return (
    <div
      tabIndex={0}
      className={`relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-200 group transition duration-300 rounded-xl overflow-hidden outline-none ${speakerBorderClass}`}
      onMouseLeave={() => setMenuOpen(false)}
      onClick={handleTileClick}
    >
      {/* Video / Cover layer */}
      <ParticipantOverlay
        visibilityState={visibilityState}
        trackRef={trackRef}
        avatar={player.avatar}
        displayName={displayName}
      />

      {/* Vote indicator (thumbs up during voting phase) */}
      {showVoteIndicator && <VoteIndicator />}

      {/* Microphone indicator and seat badge */}
      <ParticipantBadges
        gameSessionState={gameSessionState}
        isLocal={isLocal}
        isTargetHost={isTargetHost}
        isMicEnabled={isMicEnabled}
        isCameraEnabled={isCameraEnabled}
        showCameraToggle={showCameraToggle}
        isSpeaking={isSpeaking}
        isFoulSpeaking={isParticipantFoulSpeaking}
        playerIndex={playerIndex}
        displayName={displayName}
        showNominationEffect={showNominationEffect}
        playerId={(player.playerId as string) || ""}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        speakingProgress={isSpeaking && !isTargetDead ? speakingProgress : 0}
      />

      {/* Lobby menu - kick/make host */}
      {canShowLobbyMenu && (
        <ParticipantMenuButton
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((p) => !p)}
          onCloseMenu={() => setMenuOpen(false)}
          items={[
            {
              label: tg("kickPlayer"),
              onClick: onKick,
              destructive: true,
            },
            { label: tg("makeHost"), onClick: onMakeHost },
            { label: tg("mutePlayer"), onClick: handleMutePlayer },
          ]}
          ariaLabel={tg("participantSettings")}
        />
      )}

      {/* Ready indicator — centered glassy badge. For the local player the
          interactive Ready/Cancel button renders on top of it at the same
          spot (revealed on hover), so it doubles as the resting state. */}
      {!gameSessionState && isReady && (
        <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 z-20 pointer-events-none">
          <span className="flex items-center justify-center p-1 md:p-2 rounded-full border border-emerald-400/40 bg-emerald-500/30 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
            <Check className="h-3.5 w-3.5 md:h-6 md:w-6" strokeWidth={3} />
          </span>
        </div>
      )}

      {/* Nomination and foul section */}
      <NominationFoulSection
        seatNumber={player.seatNumber ?? null}
        isTargetDead={isTargetDead}
        canShowNominationButton={canShowNominationButton}
        isNominated={isNominated}
        canShowFoulButton={canShowFoulButton}
        currentFouls={currentFouls}
        showFoulNotification={showFoulNotification}
        canShowFoulSpeakButton={canShowFoulSpeakButton}
        isFoulSpeaking={isFoulSpeaking}
        foulSpeakTimeLeft={foulSpeakTimeLeft}
        canFoulSpeak={canFoulSpeak}
        startFoulSpeak={startFoulSpeak}
      />

      {/* Night action buttons (Mafia kill — variant-dispatched inside —, Yakuza
          kill, Doctor heal, Don's Right Hand promotion) */}
      <NightActionButtons
        seatNumber={player.seatNumber ?? null}
        targetPlayerId={player.playerId ?? null}
        isViewerHost={isViewerHost}
        isTargetHost={isTargetHost}
        isPlayerAlive={player.isAlive !== false}
        hasMafiaKillAuthority={hasMafiaKillAuthority}
        isMafiaPhase={isMafiaPhase}
        canShowYakuzaKillButton={canShowYakuzaKillButton}
        isYakuzaTargetSelected={isYakuzaTargetSelected}
        shouldShowYakuzaTargetIndicator={shouldShowYakuzaTargetIndicator}
        canShowDoctorHealButton={canShowDoctorHealButton}
        isAlreadyHealed={isAlreadyHealed}
        shouldShowDoctorHealIndicator={shouldShowDoctorHealIndicator}
        canShowPromoteRightHandButton={canShowPromoteRightHandButton}
      />

      {/* Ready button */}
      {isLocal && !isTargetHost && !gameSessionState && (
        <div className="flex items-center justify-center absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-20">
          <ReadyButton
            isReady={isReady}
            onReady={onReady}
            onUnready={onUnready}
            disabled={isLoadingReady}
            labelReady={tg("ready")}
            labelUnready={tc("cancel")}
            className={`${
              isMobileReadyVisible ? "flex" : "hidden"
            } md:group-hover:flex flex items-center justify-center`}
          />
        </div>
      )}

    </div>
  );
}
