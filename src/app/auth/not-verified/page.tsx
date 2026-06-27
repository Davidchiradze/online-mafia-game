import type { Metadata } from "next";
import NotVerifiedScreen from "@/components/auth/NotVerifiedScreen";

export const metadata: Metadata = {
  title: "Mafia Online",
  description: "Verify your account on mafia.ge to continue.",
};

export default function NotVerifiedPage() {
  return <NotVerifiedScreen />;
}
