"use client";

type Props = {
  message: string;
};

/**
 * Result message display.
 */
export function ResultMessage({ message }: Props) {
  return (
    <div className="text-sm text-emerald-400 font-medium">{message}</div>
  );
}
