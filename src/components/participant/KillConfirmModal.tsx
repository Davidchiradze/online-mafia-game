"use client";

import Modal from "@/components/ui/Modal";

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
  return (
    <Modal
      open={open}
      onClose={() => !isKilling && onClose()}
      title="Kill Player"
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
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={isKilling}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isKilling ? "Killing..." : "Confirm Kill"}
          </button>
        </>
      }
    >
      <p className="text-gray-700 dark:text-gray-300">
        Are you sure you want to kill Player {seatNumber}? This action cannot be
        undone.
      </p>
    </Modal>
  );
}
