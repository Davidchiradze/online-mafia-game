import React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { title?: string };

export default function FullscreenEnterIcon({
  title = "Enter full screen",
  ...props
}: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M9 3H5a2 2 0 0 0-2 2v4" />
      <path d="M15 3h4a2 2 0 0 1 2 2v4" />
      <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
      <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
      <path d="M3 3l6 6" />
      <path d="M21 3l-6 6" />
      <path d="M3 21l6-6" />
      <path d="M21 21l-6-6" />
    </svg>
  );
}
