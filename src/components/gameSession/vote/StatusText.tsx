"use client";

type Props = {
  text: string;
};

/**
 * Gray status text display.
 */
export function StatusText({ text }: Props) {
  return <div className="text-xs text-gray-300">{text}</div>;
}

