"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { lobbyGames } from "@convex/refs/lobby";
import { createLivekitRoom } from "@/lib/liveKit/actions";
import { GAME_TYPES, GAME_TYPE_LABEL } from "@/lib/constants/game";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (gameId: string) => void;
};

export default function CreateGameModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof GAME_TYPES)[number]>("japanese_mafia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreate = useMemo(() => name.trim().length > 0, [name]);
  const createGame = useMutation(lobbyGames.create);

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    setError(null);
    try {
      const gameId = await createGame({ name: name.trim(), gameType: type });
      await createLivekitRoom(gameId);
      onCreated?.(gameId);
      setName("");
      setType("japanese_mafia");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Room"
      variant="dark"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-sans text-sm font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-sans text-sm font-semibold shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Room"
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-sans">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-400 font-sans">
            Room Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Enter room name…"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 font-sans text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-400 font-sans">
            Game Mode
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof GAME_TYPES)[number])}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white font-sans text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all appearance-none cursor-pointer"
          >
            {GAME_TYPES.filter((gt) => gt !== "traditional" && gt !== "city_mafia").map((gt) => (
              <option key={gt} value={gt} className="bg-[#0f0f1a]">
                {GAME_TYPE_LABEL[gt]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
