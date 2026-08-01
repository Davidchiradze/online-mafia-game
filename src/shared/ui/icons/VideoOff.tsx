import React from "react";

import type { IconProps } from "./MicOn";

export default function VideoOffIcon({
  title = "Camera off",
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
      <path d="M3.27 2 2 3.27l1.98 1.98A1 1 0 0 0 3 6v10a1 1 0 0 0 1 1h12l3.73 3.73L21 19.46 3.27 2zM17 10.5V7a1 1 0 0 0-1-1H8.82L17 14.18V13.5l4 4v-11l-4 4z" />
    </svg>
  );
}
