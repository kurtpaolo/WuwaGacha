import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wuthering Waves Gacha Simulator",
  description: "This is for them folks who are so addicted into gacha, here's a wuwa gacha simulator for you!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#07090e] overflow-hidden">{children}</body>
    </html>
  );
}
