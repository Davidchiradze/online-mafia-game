import { getTranslations } from "next-intl/server";
import ComingSoonPage from "@/components/dashboard/ComingSoonPage";

export default async function CommunityChatPage() {
  const t = await getTranslations("headquarters");
  return (
    <ComingSoonPage
      title={t("communityChatTitle")}
      description={t("communityChatDescription")}
    />
  );
}
