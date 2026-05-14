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
      <Link className="brand brand-link" href="/" aria-label="Dashboard">
        <div className="logo">P</div>
      </Link>
      <AvatarMenu initial={initial} />
    </header>
  );
}
