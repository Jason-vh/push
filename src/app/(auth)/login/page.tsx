import { redirect } from "next/navigation";
import { LoginActions } from "@/components/LoginActions";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <>
      <h1 className="auth-display">
        Push.
        <br />
        <em>Padel.</em>
      </h1>
      <LoginActions />
    </>
  );
}
