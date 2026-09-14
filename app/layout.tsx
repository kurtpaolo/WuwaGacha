import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "For Gacha Addicts",
  description: "Wuthering Waves Gacha Simulator",
  icons: {
    icon: [
      { url: "/assets/astrite.webp", type: "image/webp" },
      { url: "/icon.webp", type: "image/webp" },
    ],
    shortcut: "/assets/astrite.webp",
    apple: "/assets/astrite.webp",
  },
};

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
          href="/api/video?path=assets/videos/gacha_gold_5star.mp4"
          as="video"
          type="video/mp4"
        />
        <link
          rel="preload"
          href="/api/video?path=assets/videos/gacha_purple_4star.mp4"
          as="video"
          type="video/mp4"
        />
      </head>
      <body className="antialiased bg-[#07090e] overflow-hidden">{children}</body>
    </html>
  );
}
