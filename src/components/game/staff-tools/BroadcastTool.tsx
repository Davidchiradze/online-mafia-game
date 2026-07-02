"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import ToolButton from "./ToolButton";
import BroadcastModal from "./BroadcastModal";

/**
 * "Send message to room" tool (moderators + admins). Encapsulates the whole
 * feature: the panel entry plus the compose modal it opens. Render only when
 * the viewer has the broadcast privilege.
 */
export default function BroadcastTool() {
  const t = useTranslations("game.staffTools");
  const { gameId } = useGameRoom();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ToolButton
        icon={<MessageSquare className="h-4 w-4" />}
        title={t("broadcast")}
        description={t("broadcastDesc")}
        onClick={() => setModalOpen(true)}
      />
      {modalOpen && (
        <BroadcastModal
          gameId={gameId as Id<"games">}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
