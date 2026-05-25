import type { Metadata } from "next";
import AuthErrorScreen from "@/components/auth/AuthErrorScreen";

export const metadata: Metadata = {
  title: "Authentication Issue — Mafia Online",
  description:
    "We couldn't verify your session. Sign in again on mafia.ge to continue.",
};

export default function AuthRequiredPage() {
  return <AuthErrorScreen />;
}
