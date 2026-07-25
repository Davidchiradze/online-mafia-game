"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { authProfiles } from "@convex/refs/lobby";
import { FEATURES, hasFeature } from "@convex/lib/entitlements";
import { PERMISSIONS, roleHasPermission } from "@convex/lib/access";
import { Lock, Users } from "lucide-react";
import { SUBSCRIPTIONS_PATH } from "@/components/auth/SubscriptionGuard";
import { LobbyGame } from "@/components/lobby/LobbyContent";
import { LobbyConfirmModal } from "@/components/lobby/LobbyConfirmModal";
import { buildSeatRing, MODE_TINT, MODE_TINT_FALLBACK } from "./helpers";
import TableStage from "./TableStage";
import StatusBadge from "./StatusBadge";
import RoomFooterAction from "./RoomFooterAction";
import SpectatorCount from "./SpectatorCount";

type Props = {
  room: LobbyGame;
  onNavigate: (roomId: string) => void;
};

export default function RoomCard({ room, onNavigate }: Props) {
  const t = useTranslations("game");
  const router = useRouter();
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const currentProfile = useQuery(authProfiles.currentProfile);
  const isPlayer =
    !!currentProfile &&
    room.players.some((p) => p.playerId === currentProfile._id);

  const entInput = {
    role: currentProfile?.role,
    subscription: currentProfile?.subscription,
  };
  const canPlay = hasFeature(entInput, FEATURES.PLAY_GAME);
  const canSpectate = hasFeature(entInput, FEATURES.SPECTATE_GAME);
  const canSpectateAny = roleHasPermission(
    currentProfile?.role,
    PERMISSIONS.GAME_SPECTATE_ANY,
  );

  // Ring seats = player seats (host sits in the middle, not on the ring).
  // Capacity chip includes the host slot → 13 for Japanese/City, 11 for Sports.
  const ringSeats = room.maxPlayers;
  const capacity = room.maxPlayers + 1;
  const count = room.players.length;
  const full = count >= capacity;

  const host = room.players.find((p) => p.playerId === room.hostId);
  const hostName = host?.nickname ?? "—";

  const seats = useMemo(
    () => buildSeatRing(room.players, room.hostId, ringSeats),
    [room.players, room.hostId, ringSeats],
  );

  const modeTint = MODE_TINT[room.gameType] ?? MODE_TINT_FALLBACK;

  const handleJoin = () => {
    if (!canPlay) {
      router.push(SUBSCRIPTIONS_PATH);
      return;
    }
    if (room.gameStatus === "playing" && isPlayer) {
      onNavigate(room._id);
      return;
    }
    setShowJoinConfirm(true);
  };
  const handleSpectate = () => {
    if (!canSpectate) {
      router.push(SUBSCRIPTIONS_PATH);
      return;
    }
    onNavigate(room._id);
  };
  const handleJoinConfirm = () => {
    setShowJoinConfirm(false);
    onNavigate(room._id);
  };

  return (
    <>
      <div
        className="flex h-full w-full max-w-[440px] flex-col gap-3 rounded-2xl border border-white/10 p-4 text-gray-200"
        style={{
          background:
            "linear-gradient(150deg,rgba(255,120,120,0.055) 0%,rgba(255,255,255,0.03) 40%,rgba(255,255,255,0.015) 100%)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-orbitron text-base font-bold tracking-[0.02em] text-white">
                {room.name}
              </span>
              {room.isPrivate && (
                <Lock className="h-[15px] w-[15px] shrink-0 text-amber-500" />
              )}
            </div>
            <div className="mt-[3px] font-orbitron text-[0.62rem] tracking-[0.12em] text-[#8a7168]">
              {t("row.host")}: {hostName}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={room.gameStatus} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-[7px]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-white/[0.14] bg-white/[0.06] px-2.5 py-[3px]">
            <Users className="h-[11px] w-[11px] text-gray-400" />
            <span className="font-orbitron text-[0.72rem] font-bold">
              <span style={{ color: full ? "#fca5a5" : "#86efac" }}>
                {count}
              </span>
              <span className="text-gray-500">/{capacity}</span>
            </span>
          </span>
          <span
            className="whitespace-nowrap rounded-[7px] px-2.5 py-[3px] text-[0.68rem] font-semibold"
            style={{
              background: modeTint.bg,
              border: `1px solid ${modeTint.border}`,
              color: modeTint.color,
            }}
          >
            {t(`gameTypes.${room.gameType}` as Parameters<typeof t>[0])}
          </span>
          {room.tableAvgRating !== undefined && (
            <span
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 py-[3px]"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
              title={t("row.tableAvgEloTooltip", { avg: room.tableAvgRating })}
            >
              <span className="font-orbitron text-[0.56rem] font-bold tracking-[0.08em] text-amber-400">
                ELO
              </span>
              <span className="font-orbitron text-[0.72rem] font-bold text-amber-300">
                {room.tableAvgRating}
              </span>
            </span>
          )}
        </div>

        {/* Table stage: host at the center, players around the ring */}
        <TableStage
          hostName={hostName}
          hostAvatar={host?.avatar}
          seats={seats}
        />

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2.5 pt-0.5">
          <SpectatorCount room={room} />
          <RoomFooterAction
            room={room}
            isPlayer={isPlayer}
            canPlay={canPlay}
            canSpectate={canSpectate}
            canSpectateAny={canSpectateAny}
            full={full}
            onJoin={handleJoin}
            onSpectate={handleSpectate}
          />
        </div>
      </div>

      {showJoinConfirm && (
        <LobbyConfirmModal
          type="join"
          roomName={room.name}
          onConfirm={handleJoinConfirm}
          onCancel={() => setShowJoinConfirm(false)}
        />
      )}
    </>
  );
}
