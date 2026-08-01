import React from "react";

import type { IconProps } from "./FullscreenEnter";

export default function WifiOffIcon({
  title = "Wi-Fi disconnected",
  ...props
}: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* Outer arc — broken (dashed) */}
      <path
        d="M 1.6 14.77 Q 12 0.92 22.4 14.77"
        strokeWidth="1.4"
        strokeDasharray="2.8 2"
      />
      {/* Mid arc — partially broken */}
      <path
        d="M 4.4 16.62 Q 12 6 19.6 16.62"
        strokeWidth="1.4"
        strokeDasharray="4.4 1.6"
      />
      {/* Inner arc — solid */}
      <path d="M 7.2 18.46 Q 12 11.08 16.8 18.46" strokeWidth="1.4" />
      {/* Base dot */}
      <circle cx="12" cy="21.69" r="1.4" fill="currentColor" stroke="none" />
      {/* Diagonal slash — "no signal" */}
      <line x1="18.8" y1="2.77" x2="5.2" y2="23.08" strokeWidth="1" />
    </svg>
  );
}
