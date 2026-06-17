"use client";

import { toast as toastify, type ToastOptions } from "react-toastify";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "info" | "error";

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  error: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
};

const ACCENT_MAP: Record<ToastType, string> = {
  success: "border-l-emerald-500/60",
  info: "border-l-sky-500/60",
  error: "border-l-red-500/60",
};

function ToastBody({
  type,
  message,
}: {
  type: ToastType;
  message: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-1 py-0.5">
      {/* {ICON_MAP[type]} */}
      <div className="text-[0.85rem] leading-snug font-medium text-white/90 font-inter">
        {message}
      </div>
    </div>
  );
}

const BASE_OPTIONS: ToastOptions = {
  autoClose: 4000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
};

function show(
  type: ToastType,
  message: React.ReactNode,
  options?: ToastOptions,
) {
  return toastify(<ToastBody type={type} message={message} />, {
    ...BASE_OPTIONS,
    ...options,
    className: `!bg-[rgba(14,14,22,0.92)] !backdrop-blur-xl !border !border-white/[0.08] !border-l-[3px] ${ACCENT_MAP[type]} !rounded-xl !shadow-[0_8px_32px_rgba(0,0,0,0.5)] !p-3 !min-h-0 [&>div]:!p-0 [&>div]:!m-0`,
    closeButton: false,
  });
}

export const toast = {
  success: (message: React.ReactNode, options?: ToastOptions) =>
    show("success", message, options),
  info: (message: React.ReactNode, options?: ToastOptions) =>
    show("info", message, options),
  error: (message: React.ReactNode, options?: ToastOptions) =>
    show("error", message, options),
};
