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
  variant?: "default" | "dark";
};

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const variantClass = {
  default:
    "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
  dark: "border border-white/10",
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
  variant = "default",
}: Props) {
  useEffect(() => {
    ReactModal.setAppElement("body");
  }, []);

  const isDark = variant === "dark";

  return (
    <ReactModal
      isOpen={open}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className={`relative w-full ${sizeClass[size]} rounded-2xl ${variantClass[variant]} p-6 shadow-2xl outline-none`}
      style={
        isDark
          ? {
              content: {
                background:
                  "linear-gradient(135deg, rgba(20,20,32,0.98) 0%, rgba(10,10,18,0.98) 100%)",
                boxShadow:
                  "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)",
              },
            }
          : undefined
      }
      overlayClassName={`fixed inset-0 z-50 flex items-center justify-center px-4 ${isDark ? "bg-black/75 backdrop-blur-sm" : "bg-black/50"}`}
      bodyOpenClassName="overflow-hidden"
    >
      <div className="flex items-start justify-between">
        {title ? (
          <h3
            className={`text-xl font-semibold ${isDark ? "text-white font-orbitron tracking-tight" : "text-gray-900 dark:text-white"}`}
          >
            {title}
          </h3>
        ) : (
          <div />
        )}
        {showClose ? (
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
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
