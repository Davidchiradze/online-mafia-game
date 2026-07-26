import type { Metadata } from "next";
import AuthErrorScreen from "@/components/auth/AuthErrorScreen";

export const metadata: Metadata = {
  title: "Online Mafia",
  description: "Sign in on mafia.ge to continue.",
};

export default function AuthRequiredPage() {
  return <AuthErrorScreen />;
}
