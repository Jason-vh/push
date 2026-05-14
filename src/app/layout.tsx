import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Push Padel",
  description: "Private padel sessions, scores, and lifetime doubles ELO.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
