import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "For Gacha Addicts | Wuthering Waves Convene Simulator",
  description: "Experience authentic Wuthering Waves convenes with hourly rotating banners, tacet field idle astrites, 5-star inventory, and showcase profiles.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wuwa-convene-system.vercel.app"),
  openGraph: {
    title: "For Gacha Addicts | Wuthering Waves Convene Simulator",
    description: "Experience authentic Wuthering Waves convenes with hourly rotating banners, tacet field idle astrites, 5-star inventory, and showcase profiles.",
    url: "/",
    siteName: "WuWa Convene Simulator",
    images: [
      {
        url: "/embed_wuwasim.png",
        width: 1200,
        height: 630,
        alt: "Wuthering Waves Convene Simulator",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Gacha Addicts | Wuthering Waves Convene Simulator",
    description: "Experience authentic Wuthering Waves convenes with hourly rotating banners, tacet field idle astrites, 5-star inventory, and showcase profiles.",
    images: ["/embed_wuwasim.png"],
  },
  icons: {
    icon: [
      { url: "/assets/astrite.webp", type: "image/webp" },
      { url: "/icon.webp", type: "image/webp" },
    ],
    shortcut: "/assets/astrite.webp",
    apple: "/assets/astrite.webp",
  },
};

import { getSummoningVideoUrl } from "@/lib/video/cutscenesConfig";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href={getSummoningVideoUrl(5)}
          as="video"
          type="video/mp4"
        />
        <link
          rel="preload"
          href={getSummoningVideoUrl(4)}
          as="video"
          type="video/mp4"
        />
      </head>
      <body className="antialiased bg-[#07090e] overflow-hidden select-none w-full h-[100dvh] min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}
