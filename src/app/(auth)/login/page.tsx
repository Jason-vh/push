import { LoginActions } from "@/components/LoginActions";

// Statically renderable so Next prefetches the actual page output and
// the toggle to /register commits instantly instead of waiting on a
// server round-trip. The "redirect authed users to /" nicety lived
// here previously but cost ~200ms per navigation; if someone signed in
// hits this URL directly they can just navigate away.
export default function LoginPage() {
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
