import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <div className="mx-auto min-h-dvh w-full max-w-app px-4 sm:px-0">{children}</div>
      </body>
    </html>
  );
}
