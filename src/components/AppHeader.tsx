import Link from "next/link";
import { AvatarMenu } from "@/components/AvatarMenu";

export function AppHeader({ userName }: { userName: string }) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="app-header">
      <Link className="brand-link" href="/" aria-label="Dashboard">
        <div className="brand-blob">P</div>
      </Link>
      <AvatarMenu initial={initial} />
    </header>
  );
}
