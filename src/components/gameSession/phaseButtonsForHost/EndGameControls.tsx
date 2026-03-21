"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PhaseButton from "@/components/ui/PhaseButton";

/**
 * Controls displayed when the game has ended
 */
const EndGameControls = () => {
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
      label="Return to Lobby"
      variant="secondary"
    />
  );
};

export default EndGameControls;
