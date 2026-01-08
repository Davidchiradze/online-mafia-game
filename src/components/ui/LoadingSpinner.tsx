interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({ message = "" }: LoadingSpinnerProps) {
  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
