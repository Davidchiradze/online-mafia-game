interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({ message = "" }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 20px rgba(220,38,38,0.25)" }}
        />
      </div>
      {message && (
        <p className="text-gray-500 font-sans text-sm tracking-wide">
          {message}
        </p>
      )}
    </div>
  );
}
