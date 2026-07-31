"use client";

import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

interface FoulEliminationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEliminating: boolean;
  seatNumber: number | null;
}

/**
 * Confirmation modal for eliminating a player by 4th foul.
 * Shows when host tries to give a 4th foul to a player.
 */
export default function FoulEliminationModal({
  open,
  onClose,
  onConfirm,
  isEliminating,
  seatNumber,
}: FoulEliminationModalProps) {
  const t = useTranslations("game.foul");
  const tCommon = useTranslations("common");

  return (
    <Modal
      open={open}
      onClose={() => !isEliminating && onClose()}
      title={t("eliminateByFoulTitle")}
      footer={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={isEliminating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={isEliminating}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEliminating ? t("eliminating") : t("confirmElimination")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-gray-700 dark:text-gray-300">
          {t("eliminateFoulBody", { seat: seatNumber ?? "" })}
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            {t("eliminateFoulWarning")}
          </p>
        </div>
      </div>
    </Modal>
  );
}
