export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInvites } = await import("@/lib/invites/sync");
    startInvites();
  }
}
