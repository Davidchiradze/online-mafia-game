"use client";

import { useTranslations } from "next-intl";
import { GAME_CLEANUP } from "@convex/lib/constants";
import Modal from "@/shared/ui/Modal";

type FinishGameModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
};

/**
 * Confirmation for ending the game.
 *
 * Worth a modal rather than a bare button because finishing is irreversible
 * and does three things at once that the host cannot undo: it unmutes every
 * camera, reveals every role, and schedules the room for deletion. The list is
 * the whole point of the dialog — the deletion delay reads from
 * `GAME_CLEANUP.DELAY_MS` so the sentence cannot drift from the scheduler.
 */
export default function FinishGameModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: FinishGameModalProps) {
  const t = useTranslations("game.finishGame");
  const tc = useTranslations("common");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("modalTitle")}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
          >
            {isLoading ? t("finishing") : t("finish")}
          </button>
        </>
      }
    >
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside">
        <li>{t("camerasWillTurnOn")}</li>
        <li>{t("rolesWillBeRevealed")}</li>
        <li>
          {t("roomWillBeDeleted", {
            seconds: Math.round(GAME_CLEANUP.DELAY_MS / 1000),
          })}
        </li>
      </ul>
    </Modal>
  );
}
