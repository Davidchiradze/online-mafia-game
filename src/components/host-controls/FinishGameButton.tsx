"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("game.finishGame");
  const tc = useTranslations("common");

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
        aria-label={t("ariaLabel")}
        title={t("ariaLabel")}
        onClick={() => setIsModalOpen(true)}
        className="rounded-full border border-red-500/60 bg-red-600/80 backdrop-blur px-4 py-2 text-xs font-medium text-white hover:bg-red-700/90 transition"
      >
        {t("buttonLabel")}
      </button>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("modalTitle")}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isFinishing}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              {tc("cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isFinishing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
            >
              {isFinishing ? t("finishing") : t("finish")}
            </button>
          </>
        }
      >
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside">
          <li>{t("camerasWillTurnOn")}</li>
          <li>{t("rolesWillBeRevealed")}</li>
          <li>{t("roomWillBeDeleted")}</li>
        </ul>
      </Modal>
    </>
  );
}
