import { getTranslations } from "next-intl/server";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

export default async function Loading() {
  const tc = await getTranslations("common");
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <LoadingSpinner message={tc("loading")} />
    </div>
  );
}
