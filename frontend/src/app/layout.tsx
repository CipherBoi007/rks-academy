import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { colors } from "@/lib/theme";
import "./globals.css";

// Self-hosted (SIL Open Font License, see ./fonts): builds need no network and visitors never call Google.
const inter = localFont({
  src: "./fonts/Inter-latin.woff2",
  weight: "400 700",
  variable: "--font-inter",
  display: "swap",
});
const oswald = localFont({
  src: "./fonts/Oswald-latin.woff2",
  weight: "500 700",
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "RKS Academy", template: "%s · RKS Academy" },
  description: "Raja Kumaran Sethupathi Sports Academy, Ramanathapuram: players, attendance, fees and the pro shop.",
  icons: { icon: "/brand/crest.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.primary.DEFAULT,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${oswald.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
