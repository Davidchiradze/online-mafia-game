"use client";

import { ReactNode, useEffect } from "react";
import ReactModal from "react-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
};

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

// Set app element for accessibility (prevents screen readers from reading background content)
if (typeof window !== "undefined") {
  ReactModal.setAppElement("body");
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  showClose = true,
}: Props) {
  // Ensure app element is set on mount (for SSR compatibility)
  useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  return (
    <ReactModal
      isOpen={open}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className={`relative w-full ${sizeClass[size]} rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800 outline-none`}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      bodyOpenClassName="overflow-hidden"
    >
      <div className="flex items-start justify-between">
        {title ? (
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        ) : (
          <div />
        )}
        {showClose ? (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            ✕
          </button>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-8 flex items-center justify-end gap-3">{footer}</div>
      ) : null}
    </ReactModal>
  );
}
