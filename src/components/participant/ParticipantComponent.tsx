"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOffIcon, MicOnIcon, MoreVerticalIcon } from "@/assets/icons";
import { useCallback, useMemo, useState } from "react";
import { kickPlayer, transferHost } from "@/lib/gameSession/actions";
import { removeParticipantFromRoom } from "@/lib/liveKit/actions";
import PopupMenu from "@/components/ui/PopupMenu";
import { useParticipantReady } from "@/hooks/useParticipantReady";
import ReadyButton from "@/components/ui/ReadyButton";

export default function ParticipantComponent({
  gameId,
  hostUserId,
  currentUserId,
  trackRef,
  playerIndex,
}: {
  gameId: string;
  hostUserId: string;
  currentUserId: string;
  trackRef: TrackReferenceOrPlaceholder;
  playerIndex: number | "host";
}) {
  const participant = (trackRef as any)?.participant;
  const isLocal = Boolean(participant?.isLocal);
  const isMicEnabled = Boolean(participant?.isMicrophoneEnabled);
  const displayName: string | undefined =
    participant?.name || participant?.identity;
  const participantId: string | undefined = participant?.identity;
  const isViewerHost = currentUserId === hostUserId;
  const isTargetHost = participantId === hostUserId;
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
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
    setMenuOpen(false);
  }, [gameId, participantId]);

  const onReady = useCallback(async () => {
    await markReady();
  }, [markReady]);

  const onUnready = useCallback(async () => {
    await markUnready();
  }, [markUnready]);

  return (
    <div
      className="relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-200 group"
      onMouseLeave={() => setMenuOpen(false)}
    >
      <ParticipantTile
        className="lk-hide-metadata"
        trackRef={trackRef}
        style={{ height: "100%" }}
      />

      {isLocal ? (
        <div className="absolute left-2 top-2 z-10">
          <TrackToggle source={Track.Source.Microphone} showIcon={true} />
        </div>
      ) : (
        <div className="absolute left-2 top-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-2 py-1 text-white">
          {isMicEnabled ? <MicOnIcon /> : <MicOffIcon />}
        </div>
      )}

      {displayName ? (
        <div className="absolute bottom-2 left-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-3 py-1 text-xs font-medium text-gray-100">
          {displayName}
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 z-10 rounded-full border border-white/10 bg-black/40 backdrop-blur px-3 py-1 text-xs font-medium text-gray-100">
          {playerIndex === "host" ? "Host" : playerIndex}
        </div>
      )}

      {canShowMenu && (
        <div className="absolute right-2 top-2 z-20">
          <button
            type="button"
            aria-label="Participant settings"
            onClick={() => setMenuOpen((p) => !p)}
            className="rounded-md border border-white/10 bg-black/40 backdrop-blur p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
          >
            <MoreVerticalIcon width={18} height={18} />
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
        <div className="absolute right-2 top-2 z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow">
          ✓
        </div>
      )}

      {/* Local participant hover-ready/unready button (non-host) */}
      {isLocal && !isTargetHost && (
        <div className="flex items-center justify-center absolute bottom-[50px] left-[50%]">
          <ReadyButton
            isReady={isReady}
            onReady={onReady}
            onUnready={onUnready}
            className="opacity-0 group-hover:opacity-100 absolute top-0"
          />
        </div>
      )}
    </div>
  );
}
