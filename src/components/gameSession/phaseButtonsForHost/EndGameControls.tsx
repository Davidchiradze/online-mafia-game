"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import PhaseButton from "@/components/ui/PhaseButton";

/**
 * Controls displayed when the game has ended
 */
const EndGameControls = () => {
  const t = useTranslations("game.host");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReturnToLobby = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // TODO: Clean up game session and reset game status
      router.push("/lobby");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleReturnToLobby}
      isLoading={isLoading}
      label={t("returnToLobby")}
      variant="secondary"
    />
  );
};

export default EndGameControls;
