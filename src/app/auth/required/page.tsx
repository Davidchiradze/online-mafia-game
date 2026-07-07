import type { Metadata } from "next";
import AuthErrorScreen from "@/components/auth/AuthErrorScreen";

export const metadata: Metadata = {
  title: "Mafia Online",
  description: "Sign in on mafia.ge to continue.",
};

export default function AuthRequiredPage() {
  return <AuthErrorScreen />;
}
