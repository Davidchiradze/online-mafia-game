"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import Modal from "@/components/ui/Modal";

type FinishGameButtonProps = {
  gameId: string;
};

export default function FinishGameButton({ gameId }: FinishGameButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishGameMutation = useMutation(gameSessions.finishGame);

  const handleConfirm = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      await finishGameMutation({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to finish game:", error);
    } finally {
      setIsFinishing(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Finish game"
        title="Finish game"
        onClick={() => setIsModalOpen(true)}
        className="rounded-full border border-red-500/60 bg-red-600/80 backdrop-blur px-4 py-2 text-xs font-medium text-white hover:bg-red-700/90 transition"
      >
        Finish Game
      </button>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Finish Game?"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isFinishing}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isFinishing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
            >
              {isFinishing ? "Finishing..." : "Finish"}
            </button>
          </>
        }
      >
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside">
          <li>Everyone&apos;s cameras will turn on</li>
          <li>All roles will be revealed</li>
          <li>The room will be deleted in about 1 minute</li>
        </ul>
      </Modal>
    </>
  );
}
