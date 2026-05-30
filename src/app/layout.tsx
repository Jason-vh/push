import type { Metadata } from "next";
import Link from "next/link";
import { AvatarMenu } from "@/components/AvatarMenu";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Push Padel",
  description: "Private padel sessions, scores, and lifetime doubles ELO.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initial = user?.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <html lang="en">
      <body>
        {user ? (
          <nav className="app-nav">
            <Link className="brand-link" href="/" aria-label="Dashboard">
              <div className="brand-blob">P</div>
            </Link>
            <AvatarMenu initial={initial} />
          </nav>
        ) : null}
        {children}
      </body>
    </html>
  );
}
