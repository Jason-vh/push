import Link from "next/link";
import { AvatarMenu } from "@/components/AvatarMenu";

export function AppHeader({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail: string;
}) {
  const initial = (userName || userEmail).trim().charAt(0).toUpperCase();

  return (
    <header className="header">
      <Link className="brand brand-link" href="/">
        <div className="logo">P</div>
        <strong>Push Padel</strong>
      </Link>
      <nav className="nav-links">
        <Link href="/">Dashboard</Link>
        <Link href="/sessions/new">New session</Link>
      </nav>
      <AvatarMenu initial={initial} />
    </header>
  );
}
