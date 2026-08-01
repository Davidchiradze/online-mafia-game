import type { Metadata } from "next";
import NotVerifiedScreen from "@/features/auth/components/NotVerifiedScreen";

export const metadata: Metadata = {
  title: "Mafia Online",
  description: "Verify your account on mafia.ge to continue.",
};

export default function NotVerifiedPage() {
  return <NotVerifiedScreen />;
}
