export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInviteLoop } = await import("@/lib/invites/reconcile");
    startInviteLoop();
  }
}
