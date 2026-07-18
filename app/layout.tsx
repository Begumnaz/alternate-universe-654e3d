import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alternate Universe — Parallel Life Explorer",
  description: "Explore who you could have been. Generate parallel lives, interview your alternate self, and roleplay realistic scenarios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
