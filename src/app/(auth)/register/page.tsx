import { RegisterForm } from "@/components/RegisterForm";

// See /login — kept static so the Link from /login commits instantly.
export default function RegisterPage() {
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
