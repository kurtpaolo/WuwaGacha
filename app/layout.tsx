import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wuthering Waves Convene System | 1:1 Replica",
  description: "Production-grade, pixel-perfect 1:1 web replica of the Wuthering Waves Convene System by Kuro Games.",
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
