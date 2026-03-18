"use client";

import { useState } from "react";
import { Doc } from "@convex/_generated/dataModel";
import { LobbyGame } from "@/components/lobby/LobbyContent";
import {
  GAME_TYPE_LABEL,
  GAME_TYPE_MAX_PLAYER_NUMBER,
} from "@/lib/constants/game";
import GameStatusBadge from "./GameStatusBadge";
import ClickableTooltip from "@/components/ui/ClickableTooltip";
import { LobbyConfirmModal } from "@/components/lobby/LobbyConfirmModal";
import { SkullIcon } from "@/assets/icons";
import { Eye, Info, Users } from "lucide-react";

type Props = {
  room: LobbyGame;
  variant: "desktop" | "mobile";
  onNavigate: (roomId: string) => void;
};

function PlayersTooltipContent({ room }: { room: LobbyGame }) {
  const maxPlayers = GAME_TYPE_MAX_PLAYER_NUMBER[room.gameType] + 1;
  const { players } = room;
  const slots = maxPlayers - players.length;

  return (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-orbitron font-bold text-[0.9rem] mb-0.5">
          Players ({players.length}/{maxPlayers})
        </h3>
        <p className="text-gray-500 font-sans text-[0.75rem]">{room.name}</p>
      </div>
      <div className="px-2 py-2 space-y-1 max-h-48 overflow-y-auto">
        {players.length === 0 ? (
          <p className="px-2 py-2 text-gray-600 font-sans text-sm">
            No players yet
          </p>
        ) : (
          players.map((player, idx) => (
            <div
              key={player.playerId ?? idx}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span
                className={`font-sans text-[0.85rem] font-medium ${
                  !player.isAlive
                    ? "text-gray-500 line-through"
                    : "text-white"
                }`}
              >
                {player.nickname ?? "Player"}
              </span>
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
            {slots} slot{slots !== 1 ? "s" : ""} available
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
  spectators: Doc<"gameSpectators">[];
  roomName: string;
}) {
  return (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-orbitron font-bold text-[0.9rem] mb-0.5">
          Spectators ({spectators.length})
        </h3>
        <p className="text-gray-500 font-sans text-[0.75rem]">{roomName}</p>
      </div>
      <div className="px-2 py-2 space-y-1 max-h-48 overflow-y-auto">
        {spectators.length === 0 ? (
          <p className="px-2 py-2 text-gray-600 font-sans text-sm">
            No spectators yet
          </p>
        ) : (
          spectators.map((spectator) => (
            <div
              key={spectator._id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-sans text-[0.85rem] font-medium text-white">
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
        {room.spectators.length}
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
  fullWidth = false,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
  fullWidth?: boolean;
}) {
  const base = fullWidth ? "w-full justify-center" : "ml-auto";

  if (room.gameStatus === "finished") {
    return (
      <button
        disabled
        className={`${fullWidth ? "w-full" : ""} px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed font-sans text-[0.85rem] font-medium`}
      >
        Ended
      </button>
    );
  }

  if (room.gameStatus === "playing") {
    return (
      <button
        onClick={onSpectate}
        className={`px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 transition-all flex items-center gap-2 ${base} font-sans text-[0.85rem] font-medium cursor-pointer`}
      >
        <Eye className="w-4 h-4" />
        Spectate
      </button>
    );
  }

  return (
    <button
      onClick={onJoin}
      className={`${fullWidth ? "w-full" : ""} px-4 py-2${fullWidth ? ".5" : ""} rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all font-sans text-[0.85rem] font-semibold cursor-pointer`}
    >
      {fullWidth ? "Join Game" : "Join"}
    </button>
  );
}

function DesktopRoomRow({
  room,
  onJoin,
  onSpectate,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
}) {
  const hostNickname =
    room.players.find((p) => p.playerId === room.hostId)?.nickname ?? "—";

  return (
    <tr className="transition-all duration-200">
      <td className="px-6 py-4">
        <div className="font-sans font-semibold text-white text-[0.95rem] leading-tight">
          {room.name}
        </div>
        <div className="font-sans text-gray-500 text-[0.78rem] mt-0.5">
          {hostNickname}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-gray-300 font-sans text-[0.85rem] font-medium">
          {GAME_TYPE_LABEL[room.gameType]}
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
        <RoomActionButton room={room} onJoin={onJoin} onSpectate={onSpectate} />
      </td>
    </tr>
  );
}

function MobileRoomRow({
  room,
  onJoin,
  onSpectate,
}: {
  room: LobbyGame;
  onJoin: () => void;
  onSpectate: () => void;
}) {
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
          <h3 className="text-white font-sans font-semibold text-base truncate mb-0.5">
            {room.name}
          </h3>
          <p className="text-gray-400 font-sans text-[0.85rem]">
            Host: {hostNickname}
          </p>
        </div>
        <GameStatusBadge status={room.gameStatus} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            Players
          </div>
          <PlayerCountWithTooltip room={room} />
        </div>
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            Spectators
          </div>
          <SpectatorCountWithTooltip room={room} />
        </div>
        <div>
          <div className="text-gray-400 font-sans text-[0.75rem] mb-1">
            Mode
          </div>
          <span className="inline-block px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-gray-300 font-sans text-[0.85rem] font-medium">
            {GAME_TYPE_LABEL[room.gameType]}
          </span>
        </div>
      </div>

      <RoomActionButton
        room={room}
        onJoin={onJoin}
        onSpectate={onSpectate}
        fullWidth
      />
    </div>
  );
}

export default function GameRoomRow({ room, variant, onNavigate }: Props) {
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const handleJoin = () => setShowJoinConfirm(true);
  const handleSpectate = () => onNavigate(room._id);
  const handleJoinConfirm = () => {
    setShowJoinConfirm(false);
    onNavigate(room._id);
  };

  const LayoutComponent = variant === "desktop" ? DesktopRoomRow : MobileRoomRow;

  return (
    <>
      <LayoutComponent
        room={room}
        onJoin={handleJoin}
        onSpectate={handleSpectate}
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
