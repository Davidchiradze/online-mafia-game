"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { Id } from "@convex/_generated/dataModel";
import { lobbyGames } from "@convex/refs/lobby";
import { deleteLivekitRoom } from "@/lib/liveKit/actions";
import { LobbyGame } from "@/components/lobby/LobbyContent";
import PopupMenu from "@/components/ui/PopupMenu";
import Modal from "@/components/ui/Modal";
import MoreVerticalIcon from "@/assets/icons/MoreVertical";

type Props = {
  session: LobbyGame;
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
  const removeGame = useMutation(lobbyGames.remove);
  const isHost = userId && session.hostId === userId;

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await removeGame({ gameId: session._id as Id<"games"> });
      await deleteLivekitRoom(session._id);
      setDeleteModalOpen(false);
      onRoomDeleted?.(session._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setIsDeleting(false);
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
                {
                  label: "Delete",
                  onClick: handleDeleteClick,
                  className: "text-red-600 dark:text-red-400",
                },
              ]}
            />
          </div>,
          document.body,
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
