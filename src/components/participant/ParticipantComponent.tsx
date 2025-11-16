"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOffIcon, MicOnIcon, MoreVerticalIcon } from "@/assets/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { kickPlayer, transferHost } from "@/lib/gameRoom/actions";
import {
  clearSeatIndex,
  removeParticipantFromRoom,
} from "@/lib/liveKit/actions";
import PopupMenu from "@/components/ui/PopupMenu";
import { useParticipantReady } from "@/hooks/useParticipantReady";
import ReadyButton from "@/components/ui/ReadyButton";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export default function ParticipantComponent({
  gameId,
  hostUserId,
  currentUserId,
  trackRef,
  playerIndex,
}: {
  gameId: string;
  hostUserId: string | null;
  currentUserId: string;
  trackRef: TrackReferenceOrPlaceholder;
  playerIndex: number | "host";
}) {
  const { gameSessionState } = useGameRoom();

  const participant = (trackRef as any)?.participant;
  const isLocal = Boolean(participant?.isLocal);
  const isMicEnabled = Boolean(participant?.isMicrophoneEnabled);
  const displayName: string | undefined =
    participant?.name || participant?.identity;
  const participantId: string | undefined = participant?.identity;
  const isViewerHost = currentUserId === hostUserId;
  const isTargetHost = participantId === hostUserId;
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isMobileReadyVisible, setIsMobileReadyVisible] =
    useState<boolean>(false);
  const mobileReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isReady, markReady, markUnready } = useParticipantReady(
    gameId,
    participantId,
    trackRef
  );

  const canShowMenu = useMemo(() => {
    // Only show menu when viewer is host, a real participant exists, and it's not the host tile
    return Boolean(
      isViewerHost && participantId && participantId !== hostUserId
    );
  }, [isViewerHost, participantId]);

  const onKick = useCallback(async () => {
    if (!participantId) return;
    await kickPlayer(gameId, participantId);
    await removeParticipantFromRoom(gameId, participantId);
    setMenuOpen(false);
  }, [gameId, participantId]);

  const onMakeHost = useCallback(async () => {
    if (!participantId) return;
    await transferHost(gameId, participantId);
    // If I became the host, ensure I no longer occupy a seat
    await clearSeatIndex(gameId, participantId);
    setMenuOpen(false);
  }, [gameId, participantId]);

  const onReady = useCallback(async () => {
    await markReady();
  }, [markReady]);

  const onUnready = useCallback(async () => {
    await markUnready();
  }, [markUnready]);

  const handleTileClick = useCallback(() => {
    // Only applicable for the local participant who isn't the host
    if (!isLocal || isTargetHost) return;
    // Show Ready button briefly on mobile/tap interactions
    setIsMobileReadyVisible(true);
    if (mobileReadyTimeoutRef.current)
      clearTimeout(mobileReadyTimeoutRef.current);
    mobileReadyTimeoutRef.current = setTimeout(() => {
      setIsMobileReadyVisible(false);
    }, 3000);
  }, [isLocal, isTargetHost]);

  useEffect(() => {
    return () => {
      if (mobileReadyTimeoutRef.current)
        clearTimeout(mobileReadyTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-200 group"
      onMouseLeave={() => setMenuOpen(false)}
      onClick={handleTileClick}
    >
      <ParticipantTile
        className="lk-hide-metadata"
        trackRef={trackRef}
        style={{ height: "100%" }}
      />

      {isLocal ? (
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
      )}

      {displayName ? (
        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-medium text-gray-100">
          {displayName}
        </div>
      ) : (
        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-medium text-gray-100">
          {playerIndex === "host" ? "Host" : playerIndex}
        </div>
      )}

      {canShowMenu && (
        <div className="absolute right-1 top-1 md:right-2 md:top-2 z-20">
          <button
            type="button"
            aria-label="Participant settings"
            onClick={() => setMenuOpen((p) => !p)}
            className="rounded-md border border-white/10 bg-black/40 backdrop-blur p-1 md:p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
          >
            <MoreVerticalIcon width={16} height={16} />
          </button>

          <PopupMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: "Kick player",
                onClick: onKick,
                className: "text-red-600 dark:text-red-400",
              },
              { label: "Make host", onClick: onMakeHost },
            ]}
            className="absolute right-0 mt-2 w-44"
          />
        </div>
      )}

      {/* Ready indicator (top-right) */}
      {isReady && (
        <div className="absolute right-1 top-[34px] md:right-2 md:top-2 z-20 w-5 h-5 md:w-6 md:h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] md:text-xs font-bold shadow">
          ✓
        </div>
      )}

      {/* Local participant hover-ready/unready button (non-host) */}
      {isLocal && !isTargetHost && !gameSessionState && (
        <div className="flex items-center justify-center absolute bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 z-20">
          <ReadyButton
            isReady={isReady}
            onReady={onReady}
            onUnready={onUnready}
            className={`${
              isMobileReadyVisible ? "block" : "hidden"
            } md:group-hover:block`}
          />
        </div>
      )}
    </div>
  );
}
