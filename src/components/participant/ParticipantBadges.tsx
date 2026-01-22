"use client";

import { Track } from "livekit-client";
import { TrackToggle } from "@livekit/components-react";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";
import { Tables } from "@/db/supabase/database.types";

interface ParticipantBadgesProps {
  gameSessionState: Tables<"game_sessions"> | null;
  isLocal: boolean;
  isTargetHost: boolean;
  isMicEnabled: boolean;
  playerIndex: number;
  displayName?: string;
  showNominationEffect: boolean;
}

/**
 * ParticipantBadges - Displays microphone indicator and seat number/name badge.
 */
export default function ParticipantBadges({
  gameSessionState,
  isLocal,
  isTargetHost,
  isMicEnabled,
  playerIndex,
  displayName,
  showNominationEffect,
}: ParticipantBadgesProps) {
  return (
    <>
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
    </>
  );
}
