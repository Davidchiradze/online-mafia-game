"use client";

import { useMemo, useState } from "react";
import { GAME_TYPES, GAME_TYPE_LABEL } from "@/lib/constants/game";
import Modal from "@/components/ui/Modal";
import { createGameRoom } from "@/lib/gameRoom/actions";
import { GameRoom } from "@/types/game/type";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (session: GameRoom) => void;
};

export default function CreateGameModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] =
    useState<(typeof GAME_TYPES)[number]>("japanese_mafia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    setError(null);
    const res = await createGameRoom({ name: name.trim(), type });
    if (!res.ok) {
      setError(res.message);
      setLoading(false);
      return;
    }
    onCreated?.(res.data);
    setName("");
    setType("traditional");
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Game"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : null}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Name of the game
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter game name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Type of the game
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as (typeof GAME_TYPES)[number])
            }
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-800 dark:text-white"
          >
            {GAME_TYPES.filter(
              (gt) => gt !== "traditional" && gt !== "city_mafia"
            ).map((gt) => (
              <option key={gt} value={gt}>
                {GAME_TYPE_LABEL[gt]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
