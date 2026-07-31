"use client";

import { useTranslations } from "next-intl";
import Modal from "@/shared/ui/Modal";

interface KillConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isKilling: boolean;
  seatNumber: number | null;
}

/**
 * Confirmation modal for killing a player.
 */
export default function KillConfirmModal({
  open,
  onClose,
  onConfirm,
  isKilling,
  seatNumber,
}: KillConfirmModalProps) {
  const t = useTranslations("game");
  const tc = useTranslations("common");

  return (
    <Modal
      open={open}
      onClose={() => !isKilling && onClose()}
      title={t("killConfirmTitle")}
      footer={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={isKilling}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tc("cancel")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={isKilling}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isKilling ? t("killing") : t("confirmKill")}
          </button>
        </>
      }
    >
      <p className="text-gray-700 dark:text-gray-300">
        {t("killConfirmBody", { seatNumber: seatNumber ?? "" })}
      </p>
    </Modal>
  );
}
