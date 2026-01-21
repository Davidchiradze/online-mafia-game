"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GameRoom } from "@/types/game/type";
import PopupMenu from "@/components/ui/PopupMenu";
import Modal from "@/components/ui/Modal";
import MoreVerticalIcon from "@/assets/icons/MoreVertical";
import { deleteGameRoom } from "@/lib/gameRoom/actions";

type Props = {
  session: GameRoom;
  userId?: string;
  onRoomDeleted?: (gameId: string) => void;
};

export default function GameTableRowActions({
  session,
  userId,
  onRoomDeleted,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isHost = userId && session.host_id === userId;

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
    setMenuOpen(true);
  };

  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
  }, [menuOpen]);

  // const handleEdit = () => {
  //   setMenuOpen(false);
  //   // TODO: Implement edit functionality
  //   console.log("Edit room:", session.id);
  // };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const result = await deleteGameRoom(session.id);
    setIsDeleting(false);
    if (result.ok) {
      setDeleteModalOpen(false);
      onRoomDeleted?.(session.id);
    } else {
      alert(result.message || "Failed to delete room");
    }
  };

  if (!isHost) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleMenuClick}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
      >
        <MoreVerticalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {menuOpen &&
        menuPosition &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed z-50"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              transform: "translateX(-100%)",
            }}
          >
            <PopupMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              items={[
                // {
                //   label: "Edit",
                //   onClick: handleEdit,
                // },
                {
                  label: "Delete",
                  onClick: handleDeleteClick,
                  className: "text-red-600 dark:text-red-400",
                },
              ]}
            />
          </div>,
          document.body
        )}

      <Modal
        open={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Room"
        footer={
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModalOpen(false);
              }}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure to delete the room?
        </p>
      </Modal>
    </>
  );
}
