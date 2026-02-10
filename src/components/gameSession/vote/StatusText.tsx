"use client";

type Props = {
  text: string;
};

/**
 * Status text display.
 */
export function StatusText({ text }: Props) {
  return <div className="text-xs text-white/70">{text}</div>;
}
