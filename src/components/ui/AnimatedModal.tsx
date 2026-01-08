"use client";

import { ReactNode, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";

interface AnimatedModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when modal requests to close */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Whether clicking backdrop closes modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes modal (default: true) */
  closeOnEsc?: boolean;
  /** Custom backdrop className */
  backdropClassName?: string;
  /** Custom content wrapper className */
  contentClassName?: string;
}

/**
 * AnimatedModal - A reusable modal component with smooth animations
 *
 * Features:
 * - Renders in a portal to document.body
 * - Smooth fade-in/out backdrop animation
 * - Scale animation for content
 * - Closes on backdrop click (optional)
 * - Closes on ESC key (optional)
 * - Prevents background scroll while open
 */
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  backdropClassName = "",
  contentClassName = "",
}: AnimatedModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to allow DOM to update before animation starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (shouldRender) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [shouldRender]);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (shouldRender) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [shouldRender, handleKeyDown]);

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center p-4 cursor-pointer
        transition-all duration-300 ease-out
        ${isAnimating ? "opacity-100" : "opacity-0"}
        ${backdropClassName}
      `}
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/70 backdrop-blur-sm
          transition-opacity duration-300 ease-out pointer-events-none
          ${isAnimating ? "opacity-100" : "opacity-0"}
        `}
      />

      {/* Content wrapper */}
      <div
        className={`
          relative z-10
          transition-all duration-300 ease-out
          ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }
          ${contentClassName}
        `}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
