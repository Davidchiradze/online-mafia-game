import { getTranslations } from "next-intl/server";
import ComingSoonPage from "@/components/dashboard/ComingSoonPage";

export default async function LeaderboardPage() {
  const t = await getTranslations("headquarters");
  return (
    <ComingSoonPage
      title={t("leaderboardTitle")}
      description={t("leaderboardDescription")}
    />
  );
}
