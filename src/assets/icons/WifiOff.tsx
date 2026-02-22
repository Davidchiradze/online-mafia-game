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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M13.83 10.17A10 10 0 0 1 19 12.859" />
      <path d="M1.42 9a16 16 0 0 1 6.34-2.827" />
      <path d="M16.24 6.176A16 16 0 0 1 22.58 9" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
