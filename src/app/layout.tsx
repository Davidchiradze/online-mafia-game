import type { Metadata } from "next";
import { Inter, Geist_Mono, Orbitron } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AudioUnlockBootstrap from "@/components/providers/AudioUnlockBootstrap";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import PresenceBootstrap from "@/components/providers/PresenceBootstrap";
import ProfileSyncBootstrap from "@/components/providers/ProfileSyncBootstrap";
import ServerTimeProvider from "@/components/providers/ServerTimeProvider";
import { ThemeProvider } from "@/components/theme-provider/theme-provider";
import { ToastContainer } from "react-toastify";
import "./globals.css";
import "@/styles/game.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Georgian font (BPG Banner ExtraSquare Caps, via npm): Inter/Orbitron ship
// Latin-only subsets, so Georgian glyphs fall back to this per-glyph via the CSS
// font stacks. When the Georgian locale is active it's promoted to the primary
// face (see globals.css).
const ninoGeorgian = localFont({
  src: "../../node_modules/bpg-banner-extrasquare-caps/fonts/bpg-banner-extrasquare-caps-webfont.woff2",
  variable: "--font-noto-georgian",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mafia Online",
  description:
    "The ultimate social deduction game. Outsmart your friends with live voice chat, hidden roles, and ruthless strategy.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${orbitron.variable} ${ninoGeorgian.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConvexClientProvider>
            <ProfileSyncBootstrap />
            <PresenceBootstrap />
            <AudioUnlockBootstrap />
            <ServerTimeProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <ToastContainer
                  position="top-right"
                  autoClose={4000}
                  hideProgressBar
                  newestOnTop
                  closeOnClick
                  pauseOnFocusLoss
                  pauseOnHover
                  draggable={false}
                  theme="dark"
                  toastStyle={{
                    background: "transparent",
                    boxShadow: "none",
                    padding: 0,
                  }}
                  style={{ zIndex: 99999 }}
                  limit={4}
                />
              </ThemeProvider>
            </ServerTimeProvider>
          </ConvexClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
