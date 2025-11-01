import React from "react";

import type { IconProps } from "./MicOn";

export default function MicOffIcon({
  title = "Microphone off",
  ...props
}: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M19 11a7 7 0 0 1-1.05 3.71l1.42 1.42A8.96 8.96 0 0 0 21 11h-2zM15 11.17V6a3 3 0 0 0-5.83-1.17l1.53 1.53A1.99 1.99 0 0 1 12 6a2 2 0 0 1 2 2v3.17l1 1zM4.41 3.14 3 4.55l5.01 5.01V11a4 4 0 0 0 4 4c.35 0 .69-.05 1-.15l1.62 1.62A6.96 6.96 0 0 1 12 17a7 7 0 0 1-7-7H3a9 9 0 0 0 7 8.73V21H9v2h6v-2h-1v-2.27c.86-.2 1.67-.55 2.39-1.02l3.2 3.2 1.41-1.41L4.41 3.14z" />
    </svg>
  );
}
