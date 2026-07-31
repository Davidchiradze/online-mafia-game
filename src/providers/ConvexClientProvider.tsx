"use client";

import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { ReactNode } from "react";
import { useAuthFromTokenEndpoint } from "@/features/auth/hooks/useAuthFromTokenEndpoint";
import { AuthBridgeProvider } from "@/features/auth/lib/authBridgeContext";
import ConvexAuthFailureRedirect from "@/providers/ConvexAuthFailureRedirect";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthBridgeProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromTokenEndpoint}>
        <ConvexAuthFailureRedirect />
        {children}
      </ConvexProviderWithAuth>
    </AuthBridgeProvider>
  );
}
