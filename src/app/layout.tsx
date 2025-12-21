import "./globals.css";
import Providers from "./providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Git_Gud - Productivity Protocol",
  description: "Gamified task management system with XP, streaks, and anti-cheat mechanics",
  keywords: ["productivity", "task management", "gamification", "XP", "streaks"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
