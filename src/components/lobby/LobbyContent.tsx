"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Doc } from "@convex/_generated/dataModel";
import GameTable from "@/components/game/GameTable";
import CreateGameModal from "@/components/modals/CreateGameModal";
import LobbyHeader from "./LobbyHeader";
import { Search, Plus } from "lucide-react";
import LobbyStats from "./LobbyStats";

export type LobbyGame = Doc<"games"> & {
  players: Doc<"gamePlayers">[];
  spectators: Doc<"gameSpectators">[];
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
    const activeRooms = games.filter(
      (s) => s.gameStatus !== "finished",
    ).length;
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
    <div
      className="min-h-screen relative text-white"
      style={{
        background:
          "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
      }}
    >
      {/* Background: city image + overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1568450902879-3b3ffb882ecb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwY2l0eSUyMG5pZ2h0JTIwc2t5bGluZSUyMG5vaXJ8ZW58MXx8fHwxNzcyMTE2NjM5fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt=""
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />
      </div>

      <LobbyHeader />

      <main className="relative z-10 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page heading */}
          <div className="mb-8">
            <h1
              className="font-orbitron font-bold text-white mb-1.5 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}
            >
              Game Lobby
            </h1>
            <p className="text-gray-500 font-sans text-sm">
              Choose a room to join or create your own
            </p>
          </div>

          {/* Stats row */}
          <LobbyStats stats={stats} />

          {/* Filters + Create */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rooms…"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 font-sans text-sm focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 transition-all"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white font-sans text-sm focus:outline-none focus:border-red-500/40 transition-all cursor-pointer appearance-none"
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

            {/* Create room */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-sans font-semibold text-sm shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </button>
          </div>

          {/* Rooms table */}
          <GameTable rooms={filtered} />
        </div>
      </main>

      <CreateGameModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
