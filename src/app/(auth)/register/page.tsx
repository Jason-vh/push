import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getCurrentUser } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <>
      <h1 className="auth-display">
        Your.
        <br />
        <em>Name.</em>
      </h1>
      <RegisterForm />
    </>
  );
}
