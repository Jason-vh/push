import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailSettings } from "@/components/EmailSettings";
import { getCurrentUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="shell">
      <div className="keen-title-row">
        <Link className="keen-back" href="/" aria-label="Back to dashboard">
          ‹
        </Link>
        <h1 className="keen-title">Settings</h1>
      </div>
      <EmailSettings email={user.email} />
    </main>
  );
}
