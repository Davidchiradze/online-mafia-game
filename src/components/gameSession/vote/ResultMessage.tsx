"use client";

type Props = {
  message: string;
};

/**
 * Green result message display.
 */
export function ResultMessage({ message }: Props) {
  return (
    <div className="text-sm text-green-400 font-medium">{message}</div>
  );
}

