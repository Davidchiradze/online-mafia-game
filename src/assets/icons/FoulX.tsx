import React from "react";

import type { IconProps } from "./MicOn";

export default function FoulXIcon({ title, ...props }: IconProps) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <line x1="1" y1="1" x2="7" y2="7" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="1" x2="1" y2="7" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
