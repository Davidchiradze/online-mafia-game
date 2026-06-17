"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Doc } from "@convex/_generated/dataModel";
import GameTable from "@/components/game/GameTable";
import CreateGameModal from "@/components/modals/CreateGameModal";
import { Search, Plus } from "lucide-react";
import LobbyStats from "./LobbyStats";

export type LobbyGame = Doc<"games"> & {
  players: (Doc<"gamePlayers"> & { avatar?: string })[];
  spectators: (Doc<"gameSpectators"> & { avatar?: string })[];
};

type Props = {
  games: LobbyGame[];
};

export default function LobbyContent({ games }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();

  const handleCreated = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  const stats = useMemo(() => {
    const activeRooms = games.filter((s) => s.gameStatus !== "finished").length;
    const playing = games.filter((s) => s.gameStatus === "playing").length;
    const totalPlayers = games.reduce(
      (acc, s) => acc + (s.players?.length ?? 0),
      0,
    );
    const totalSpectators = games.reduce(
      (acc, s) => acc + (s.spectators?.length ?? 0),
      0,
    );
    return { activeRooms, playing, totalPlayers, totalSpectators };
  }, [games]);

  const filtered = useMemo(() => {
    return games.filter((s) => {
      const matchSearch =
        search.trim() === "" ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || s.gameStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [games, search, statusFilter]);

  return (
    <div className="relative z-10 px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1
            className="mb-1.5 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text font-orbitron text-transparent"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700 }}
          >
            Game Lobby
          </h1>
          <p className="font-sans text-sm text-gray-500">
            Choose a room to join or create your own
          </p>
        </div>

        <LobbyStats stats={stats} />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-2.5 pl-11 pr-4 font-sans text-sm text-white placeholder-gray-600 transition-all focus:border-red-500/40 focus:outline-none focus:ring-1 focus:ring-red-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 font-sans text-sm text-white transition-all focus:border-red-500/40 focus:outline-none"
          >
            <option value="all" className="bg-[#0a0a12]">
              All Status
            </option>
            <option value="not_started" className="bg-[#0a0a12]">
              Not Started
            </option>
            <option value="playing" className="bg-[#0a0a12]">
              Playing
            </option>
            <option value="finished" className="bg-[#0a0a12]">
              Finished
            </option>
          </select>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
          >
            <Plus className="h-4 w-4" />
            Create Room
          </button>
        </div>

        <GameTable rooms={filtered} />
      </div>

      <CreateGameModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
