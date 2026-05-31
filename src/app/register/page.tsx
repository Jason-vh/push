import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="auth-shell">
      <section className="auth-editorial">
        <header className="auth-head">
          <div className="brand-blob">P</div>
          <h1 className="auth-display">
            Your.
            <br />
            <em>Name.</em>
          </h1>
        </header>
        <RegisterForm />
      </section>
    </main>
  );
}
