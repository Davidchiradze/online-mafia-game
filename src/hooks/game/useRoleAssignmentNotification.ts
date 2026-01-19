"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JAPANESE_MAFIA_ROLE_LABEL } from "@/lib/constants/game";

/** Role descriptions for each role type */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  DON: "You lead the Mafia. Choose your targets wisely and identify the Detective.",
  MAFIA: "Eliminate players at night. Work with your team to survive.",
  MAFIA_RIGHT_HAND: "You are the Don's trusted ally. If the Don falls, you take command.",
  SHOGUN: "You lead the Yakuza. Coordinate with your team to eliminate threats.",
  YAKUZA: "Work in the shadows. Eliminate players and protect the Shogun.",
  DETECTIVE: "Investigate players at night to find the Mafia.",
  CITIZEN: "Vote wisely during the day to eliminate the Mafia.",
  DOCTOR: "Protect one player each night from elimination.",
};

interface UseRoleAssignmentNotificationReturn {
  /** Whether the role reveal modal should be shown */
  showRoleModal: boolean;
  /** The role to display */
  role: string | null;
  /** The role description */
  description: string;
  /** Callback to close the modal */
  closeRoleModal: () => void;
}

/**
 * Hook to detect role assignment and trigger the role reveal modal
 * 
 * Uses the viewerRole from context to detect when a role is first assigned.
 * When viewerRole changes from null to a value, triggers the modal.
 */
export function useRoleAssignmentNotification(
  viewerRole: string | null
): UseRoleAssignmentNotificationReturn {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [assignedRole, setAssignedRole] = useState<string | null>(null);
  const previousRoleRef = useRef<string | null>(null);
  const hasShownModalRef = useRef(false);

  // Detect when role is first assigned
  useEffect(() => {
    // Role changed from null/undefined to a value - first assignment
    if (
      viewerRole &&
      !previousRoleRef.current &&
      !hasShownModalRef.current
    ) {
      console.log("🎭 Role assigned:", viewerRole);
      setAssignedRole(viewerRole);
      setShowRoleModal(true);
      hasShownModalRef.current = true;
    }

    previousRoleRef.current = viewerRole;
  }, [viewerRole]);

  const closeRoleModal = useCallback(() => {
    setShowRoleModal(false);
  }, []);

  // Get role label for display
  const roleLabel = assignedRole
    ? JAPANESE_MAFIA_ROLE_LABEL[assignedRole as keyof typeof JAPANESE_MAFIA_ROLE_LABEL] ?? assignedRole
    : "";

  // Get description for the role
  const description = assignedRole
    ? ROLE_DESCRIPTIONS[assignedRole.toUpperCase()] ?? ""
    : "";

  return {
    showRoleModal,
    role: assignedRole,
    description,
    closeRoleModal,
  };
}

