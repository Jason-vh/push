import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CreateSessionForm } from "@/components/CreateSessionForm";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const players = await prisma.player.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <main className="shell">
      <AppHeader userName={user.player?.name ?? user.name} userEmail={user.email} />
      <CreateSessionForm
        knownPlayers={players.map((player) => ({ email: player.email, name: player.name }))}
      />
    </main>
  );
}
