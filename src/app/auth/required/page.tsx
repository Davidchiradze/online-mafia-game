import type { Metadata } from "next";
import AuthErrorScreen from "@/features/auth/components/AuthErrorScreen";

export const metadata: Metadata = {
  title: "Online Mafia",
  description: "Sign in on mafia.ge to continue.",
};

type AuthRequiredPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthRequiredPage({
  searchParams,
}: AuthRequiredPageProps) {
  const { next } = await searchParams;
  return <AuthErrorScreen returnTo={next} />;
}
