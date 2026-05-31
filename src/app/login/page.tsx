import { redirect } from "next/navigation";
import { LoginActions } from "@/components/LoginActions";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="auth-shell">
      <section className="auth-editorial">
        <header className="auth-head">
          <div className="brand-blob">P</div>
          <h1 className="auth-display">
            Push.
            <br />
            <em>Padel.</em>
          </h1>
        </header>
        <LoginActions />
      </section>
    </main>
  );
}
