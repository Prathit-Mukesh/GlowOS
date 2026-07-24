import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "GlowOS — Your AI Glow-Up Engine",
    template: "%s · GlowOS",
  },
  description:
    "A personalized self-improvement system across Body, Skin, Style, Mind and Voice. Kind, evidence-aware, built for real life.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#141b2e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce-based CSP requires dynamic rendering: a statically prerendered page
  // cannot contain a per-request nonce, so its scripts get blocked (blank
  // /quiz bug). Reading headers() opts every route out of prerendering, and
  // Next then stamps the nonce from the proxy's CSP request header onto all
  // of its script tags.
  await headers();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <div className="mx-auto min-h-dvh w-full max-w-app px-4 sm:px-0">{children}</div>
      </body>
    </html>
  );
}
