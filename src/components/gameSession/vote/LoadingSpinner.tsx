"use client";

type Props = {
  text?: string;
};

/**
 * Loading spinner with optional text.
 */
export function LoadingSpinner({ text = "Processing..." }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  );
}

