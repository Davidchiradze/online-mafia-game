"use client";

import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { ReactNode } from "react";
import { useAuthFromTokenEndpoint } from "@/hooks/auth/useAuthFromTokenEndpoint";
import { AuthBridgeProvider } from "@/lib/auth/authBridgeContext";
import ConvexAuthFailureRedirect from "@/components/providers/ConvexAuthFailureRedirect";

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
