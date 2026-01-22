"use client";

import { useState, useCallback } from "react";

interface RoleRevealData {
  role: string;
  description?: string;
}

interface UseRoleRevealModalReturn {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current role data to display */
  roleData: RoleRevealData | null;
  /** Open the modal with role data */
  showRoleModal: (data: RoleRevealData) => void;
  /** Close the modal */
  closeRoleModal: () => void;
}

/**
 * useRoleRevealModal - Hook for managing role reveal modal state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOpen, roleData, showRoleModal, closeRoleModal } = useRoleRevealModal();
 *
 *   const handleReveal = () => {
 *     showRoleModal({
 *       role: "MAFIA",
 *       description: "You eliminate players at night"
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleReveal}>Reveal Role</button>
 *       {roleData && (
 *         <RoleRevealModal
 *           isOpen={isOpen}
 *           role={roleData.role}
 *           description={roleData.description}
 *           onClose={closeRoleModal}
 *         />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useRoleRevealModal(): UseRoleRevealModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [roleData, setRoleData] = useState<RoleRevealData | null>(null);

  const showRoleModal = useCallback((data: RoleRevealData) => {
    setRoleData(data);
    setIsOpen(true);
  }, []);

  const closeRoleModal = useCallback(() => {
    setIsOpen(false);
    // Keep roleData for exit animation, clear after delay
    setTimeout(() => {
      setRoleData(null);
    }, 400);
  }, []);

  return {
    isOpen,
    roleData,
    showRoleModal,
    closeRoleModal,
  };
}
