import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <LoadingSpinner message="Loading…" />
    </div>
  );
}
