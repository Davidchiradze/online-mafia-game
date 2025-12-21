"use client";

import { useEffect, useRef } from "react";
import { getPlayerRole } from "@/lib/gamePlayerRoles/actions";
import { JAPANESE_MAFIA_ROLE_LABEL } from "@/lib/constants/game";
import { toast } from "react-toastify";

/**
 * Hook to listen for role assignment and show notification using react-toastify
 * Uses polling via server action since roles are not exposed via realtime
 */
export function useRoleAssignmentNotification(gameId: string, userId: string) {
  const previousRoleRef = useRef<string | null>(null);
  const hasShownNotificationRef = useRef(false);

  useEffect(() => {
    if (!gameId || !userId) return;

    // Poll for role assignment every 2 seconds
    const interval = setInterval(async () => {
      // const result = await getPlayerRole(gameId, userId);
      // if (result.ok) {
      //   const currentRole = result.role;
      //   // Show notification if role changed from null/undefined to a value
      //   if (
      //     currentRole &&
      //     currentRole !== previousRoleRef.current &&
      //     !hasShownNotificationRef.current
      //   ) {
      //     const roleLabel =
      //       JAPANESE_MAFIA_ROLE_LABEL[
      //         currentRole as keyof typeof JAPANESE_MAFIA_ROLE_LABEL
      //       ] || currentRole;
      //     toast.success(`🎭 Your role: ${roleLabel}!`, {
      //       position: "top-right",
      //       autoClose: 8000,
      //       hideProgressBar: false,
      //       closeOnClick: true,
      //       pauseOnHover: true,
      //       draggable: true,
      //     });
      //     hasShownNotificationRef.current = true;
      //   }
      //   previousRoleRef.current = currentRole;
      // }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [gameId, userId]);
}
