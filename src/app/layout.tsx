import type { Metadata } from "next";
import { Inter, Geist_Mono, Orbitron } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import AudioUnlockBootstrap from "@/providers/AudioUnlockBootstrap";
import ConvexClientProvider from "@/providers/ConvexClientProvider";
import ProfileSyncBootstrap from "@/providers/ProfileSyncBootstrap";
import PresenceBootstrap from "@/providers/PresenceBootstrap";
import VerificationGate from "@/providers/VerificationGate";
import ServerTimeProvider from "@/providers/ServerTimeProvider";
import { ThemeProvider } from "@/components/theme-provider/theme-provider";
import { ToastContainer } from "react-toastify";
import "./globals.css";
import "@/features/game-room/styles/game.css";

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
  title: "Online Mafia",
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
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KZMJSP5K');`}
        </Script>
        {/* End Google Tag Manager */}

        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JW6WDJDWJ9"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-JW6WDJDWJ9');`}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} ${orbitron.variable} ${ninoGeorgian.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KZMJSP5K"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConvexClientProvider>
            <ProfileSyncBootstrap />
            <VerificationGate />
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
