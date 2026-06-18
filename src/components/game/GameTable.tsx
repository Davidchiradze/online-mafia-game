"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LobbyGame } from "@/components/lobby/LobbyContent";
import GameRoomRow from "./GameRoomRow";

type Props = {
  rooms: LobbyGame[];
};

export default function GameTable({ rooms }: Props) {
  const router = useRouter();
  const t = useTranslations("game");

  const COL_HEADERS = [
    { label: t("table.colRoomName"), className: "w-[28%]" },
    { label: t("table.colMode"), className: "w-[14%]" },
    { label: t("table.colPlayers"), className: "w-[16%]" },
    { label: t("table.colSpectators"), className: "w-[16%]" },
    { label: t("table.colStatus"), className: "w-[14%]" },
    { label: t("table.colAction"), className: "w-[12%] text-right" },
  ];

  const navigateToRoom = (roomId: string) => {
    router.push(`/game/${roomId}`);
  };

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden backdrop-blur-md"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Mobile */}
      <div className="p-4 lg:hidden">
        {rooms.length === 0 ? (
          <EmptyState noRoomsFound={t("table.noRoomsFound")} />
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <GameRoomRow
                key={room._id}
                room={room}
                variant="mobile"
                onNavigate={navigateToRoom}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block min-w-full overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr
              className="border-b border-white/10"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              {COL_HEADERS.map(({ label, className }) => (
                <th
                  key={label}
                  className={`px-6 py-4 text-left font-orbitron font-semibold text-gray-400 uppercase tracking-wider text-[0.7rem] ${className}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState noRoomsFound={t("table.noRoomsFound")} />
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <GameRoomRow
                  key={room._id}
                  room={room}
                  variant="desktop"
                  onNavigate={navigateToRoom}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ noRoomsFound }: { noRoomsFound: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
        <span className="text-gray-600 font-orbitron font-bold text-lg">?</span>
      </div>
      <p className="text-gray-600 font-sans text-sm">{noRoomsFound}</p>
    </div>
  );
}
