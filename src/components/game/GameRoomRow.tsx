"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Doc } from "@convex/_generated/dataModel";
import { authProfiles } from "@convex/refs/lobby";
import { FEATURES, hasFeature } from "@convex/lib/entitlements";
import { PERMISSIONS, roleHasPermission } from "@convex/lib/access";
import { SUBSCRIPTIONS_PATH } from "@/components/auth/SubscriptionGuard";
import { LobbyGame } from "@/components/lobby/LobbyContent";
import { GAME_TYPE_MAX_PLAYER_NUMBER } from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import ClickableTooltip from "@/components/ui/ClickableTooltip";
import UserAvatar from "@/components/ui/UserAvatar";
import { LobbyConfirmModal } from "@/components/lobby/LobbyConfirmModal";
import { SkullIcon } from "@/assets/icons";
import { Eye, Info, Lock, LogIn, Users } from "lucide-react";
import { SPECTATOR } from "@convex/lib/constants";

type Props = {
  room: LobbyGame;
  variant: "desktop" | "mobile";
  onNavigate: (roomId: string) => void;
};

function PlayersTooltipContent({ room }: { room: LobbyGame }) {
  const t = useTranslations("game");
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[room.gameType] + 1;
  const { players } = room;
  const slots = maxPlayers - players.length;

  return (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-orbitron font-bold text-[0.9rem] mb-0.5">
          {t("row.playersTooltipTitle", {
            count: players.length,
            max: maxPlayers,
          })}
        </h3>
        <p className="text-gray-500 font-sans text-[0.75rem]">{room.name}</p>
      </div>
      <div className="px-2 py-2 space-y-1 max-h-48 overflow-y-auto">
        {players.length === 0 ? (
          <p className="px-2 py-2 text-gray-600 font-sans text-sm">
            {t("row.noPlayersYetTooltip")}
          </p>
        ) : (
          players.map((player, idx) => (
            <div
              key={player.playerId ?? idx}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar
                  src={player.avatar}
                  name={player.nickname}
                  size={24}
                />
                <span
                  className={`font-sans text-[0.85rem] font-medium truncate ${
                    !player.isAlive
                      ? "text-gray-500 line-through"
                      : "text-white"
                  }`}
                >
                  {player.nickname ?? "Player"}
                </span>
              </div>
              {!player.isAlive && (
                <SkullIcon size={14} className="text-red-400 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
      {slots > 0 && (
        <div className="px-4 py-2.5 border-t border-white/10">
          <span className="text-gray-500 font-sans text-[0.75rem]">
            {t("row.slotsAvailable", { count: slots })}
          </span>
        </div>
      )}
    </div>
  );
}

function PlayerCountWithTooltip({ room }: { room: LobbyGame }) {
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[room.gameType] + 1;

  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-white font-sans font-semibold text-[0.9rem]">
        {room.players.length}/{maxPlayers}
      </span>
      <ClickableTooltip
        content={<PlayersTooltipContent room={room} />}
        side="bottom"
        align="start"
      >
        <span className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
          <Info className="w-4 h-4 text-gray-500 hover:text-gray-300" />
        </span>
      </ClickableTooltip>
    </div>
  );
}

function SpectatorTooltipContent({
  spectators,
  roomName,
}: {
  spectators: (Doc<"gameSpectators"> & { avatar?: string })[];
  roomName: string;
}) {
  const t = useTranslations("game");
  return (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-orbitron font-bold text-[0.9rem] mb-0.5">
          {t("row.spectatorsTooltipTitle", { count: spectators.length })}
        </h3>
        <p className="text-gray-500 font-sans text-[0.75rem]">{roomName}</p>
      </div>
      <div className="px-2 py-2 space-y-1 max-h-48 overflow-y-auto">
        {spectators.length === 0 ? (
          <p className="px-2 py-2 text-gray-600 font-sans text-sm">
            {t("row.noSpectatorsYet")}
          </p>
        ) : (
          spectators.map((spectator) => (
            <div
              key={spectator._id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <UserAvatar
                src={spectator.avatar}
                name={spectator.nickname}
                size={24}
              />
              <span className="font-sans text-[0.85rem] font-medium text-white truncate">
                {spectator.nickname}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SpectatorCountWithTooltip({ room }: { room: LobbyGame }) {
  return (
    <div className="flex items-center gap-2">
      <Eye className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-white font-sans font-semibold text-[0.9rem]">
        {room.spectators.length}/{SPECTATOR.MAX_SPECTATORS_PER_GAME}
      </span>
      {room.spectators.length > 0 && (
        <ClickableTooltip
          content={
            <SpectatorTooltipContent
              spectators={room.spectators}
              roomName={room.name}
            />
          }
          side="bottom"
          align="start"
        >
          <span className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
            <Info className="w-4 h-4 text-gray-500 hover:text-gray-300" />
          </span>
        </ClickableTooltip>
      )}
    </div>
  );
}

function RoomActionButton({
  room,
  onJoin,
  onSpectate,
  isPlayer,
  canPlay,
  canSpectate,
  canSpectateAny,
  fullWidth = false,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
  isPlayer: boolean;
  canPlay: boolean;
  canSpectate: boolean;
  canSpectateAny: boolean;
  fullWidth?: boolean;
}) {
  const t = useTranslations("game");
  const base = fullWidth ? "w-full justify-center" : "ml-auto";
  // When the user can't play/spectate, the action becomes a "subscribe" prompt
  // (the handler redirects to /subscriptions). A lock icon signals this.
  const lockIcon = canPlay ? null : <Lock className="w-3.5 h-3.5" />;
  const spectateLockIcon = canSpectate ? null : (
    <Lock className="w-3.5 h-3.5" />
  );

  if (room.gameStatus === "finished") {
    return (
      <button
        disabled
        className={`${fullWidth ? "w-full" : ""} px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed font-sans text-[0.85rem] font-medium`}
      >
        {t("row.ended")}
      </button>
    );
  }

  if (room.gameStatus === "playing") {
    if (isPlayer) {
      return (
        <button
          onClick={onJoin}
          className={`px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all flex items-center gap-2 ${base} font-sans text-[0.85rem] font-semibold cursor-pointer`}
        >
          {lockIcon ?? <LogIn className="w-4 h-4" />}
          {fullWidth ? t("row.rejoinGame") : t("row.rejoin")}
        </button>
      );
    }

    // Private games block normal spectators, but staff with GAME_SPECTATE_ANY
    // (moderators/admins) may watch — fall through to the spectate button.
    if (room.isPrivate && !canSpectateAny) {
      return (
        <button
          disabled
          className={`px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed font-sans text-[0.85rem] font-medium flex items-center gap-2 ${base}`}
        >
          <Lock className="w-3.5 h-3.5" />
          {t("row.private")}
        </button>
      );
    }

    return (
      <button
        onClick={onSpectate}
        className={`px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all flex items-center gap-2 ${base} font-sans text-[0.85rem] font-medium cursor-pointer`}
      >
        {spectateLockIcon ?? <Eye className="w-4 h-4" />}
        {t("row.spectate")}
      </button>
    );
  }

  return (
    <button
      onClick={onJoin}
      className={`${fullWidth ? "w-full" : ""} inline-flex items-center justify-center gap-2 px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all font-sans text-[0.85rem] font-semibold cursor-pointer ${base}`}
    >
      {lockIcon}
      {fullWidth ? t("row.joinGame") : t("row.join")}
    </button>
  );
}

function DesktopRoomRow({
  room,
  onJoin,
  onSpectate,
  isPlayer,
  canPlay,
  canSpectate,
  canSpectateAny,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
  isPlayer: boolean;
  canPlay: boolean;
  canSpectate: boolean;
  canSpectateAny: boolean;
}) {
  const hostNickname =
    room.players.find((p) => p.playerId === room.hostId)?.nickname ?? "—";
  const t = useTranslations("game");

  return (
    <tr className="transition-all duration-200">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-sans font-semibold text-white text-[0.95rem] leading-tight">
            {room.name}
          </span>
          {room.isPrivate && (
            <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
          )}
        </div>
        <div className="font-sans text-gray-500 text-[0.78rem] mt-0.5">
          {hostNickname}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-gray-300 font-sans text-[0.85rem] font-medium">
          {t(`gameTypes.${room.gameType}` as Parameters<typeof t>[0])}
        </span>
      </td>
      <td className="px-6 py-4">
        <PlayerCountWithTooltip room={room} />
      </td>
      <td className="px-6 py-4">
        <SpectatorCountWithTooltip room={room} />
      </td>
      <td className="px-6 py-4">
        <GameStatusBadge status={room.gameStatus} />
      </td>
      <td className="px-6 py-4 text-right">
        <RoomActionButton
          room={room}
          onJoin={onJoin}
          onSpectate={onSpectate}
          isPlayer={isPlayer}
          canPlay={canPlay}
          canSpectate={canSpectate}
          canSpectateAny={canSpectateAny}
        />
      </td>
    </tr>
  );
}

function MobileRoomRow({
  room,
  onJoin,
  onSpectate,
  isPlayer,
  canPlay,
  canSpectate,
  canSpectateAny,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
  isPlayer: boolean;
  canPlay: boolean;
  canSpectate: boolean;
  canSpectateAny: boolean;
}) {
  const t = useTranslations("game");
  const hostNickname =
    room.players.find((p) => p.playerId === room.hostId)?.nickname ?? "—";

  return (
    <div
      className="rounded-xl border border-white/10 p-4 transition-all duration-200"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-sans font-semibold text-base truncate mb-0.5 flex items-center gap-2">
            {room.name}
            {room.isPrivate && (
              <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
            )}
          </h3>
          <p className="text-gray-400 font-sans text-[0.85rem]">
            {t("row.host")}: {hostNickname}
          </p>
        </div>
        <GameStatusBadge status={room.gameStatus} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            {t("table.colPlayers")}
          </div>
          <PlayerCountWithTooltip room={room} />
        </div>
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            {t("table.colSpectators")}
          </div>
          <SpectatorCountWithTooltip room={room} />
        </div>
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            {t("table.colMode")}
          </div>
          <span className="inline-block px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-gray-300 font-sans text-[0.85rem] font-medium">
            {t(`gameTypes.${room.gameType}` as Parameters<typeof t>[0])}
          </span>
        </div>
      </div>

      <RoomActionButton
        room={room}
        onJoin={onJoin}
        onSpectate={onSpectate}
        isPlayer={isPlayer}
        canPlay={canPlay}
        canSpectate={canSpectate}
        canSpectateAny={canSpectateAny}
        fullWidth
      />
    </div>
  );
}

export default function GameRoomRow({ room, variant, onNavigate }: Props) {
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const router = useRouter();
  const currentProfile = useQuery(authProfiles.currentProfile);
  const isPlayer =
    !!currentProfile &&
    room.players.some((p) => p.playerId === currentProfile._id);

  // Playing/spectating require an active subscription (or staff). Derived from
  // the same profile query — no extra fetch. Authoritatively re-checked
  // server-side in `game.players.join` / `game.spectators.join`.
  const entInput = {
    role: currentProfile?.role,
    subscription: currentProfile?.subscription,
  };
  const canPlay = hasFeature(entInput, FEATURES.PLAY_GAME);
  const canSpectate = hasFeature(entInput, FEATURES.SPECTATE_GAME);
  // Staff (moderators/admins) may spectate private/full games. Authoritatively
  // re-checked server-side in `game.spectators.join`.
  const canSpectateAny = roleHasPermission(
    currentProfile?.role,
    PERMISSIONS.GAME_SPECTATE_ANY,
  );

  const handleJoin = () => {
    if (!canPlay) {
      router.push(SUBSCRIPTIONS_PATH);
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

  const LayoutComponent =
    variant === "desktop" ? DesktopRoomRow : MobileRoomRow;

  return (
    <>
      <LayoutComponent
        room={room}
        onJoin={handleJoin}
        onSpectate={handleSpectate}
        isPlayer={isPlayer}
        canPlay={canPlay}
        canSpectate={canSpectate}
        canSpectateAny={canSpectateAny}
      />

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
