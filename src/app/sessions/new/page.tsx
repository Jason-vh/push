import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CreateSessionForm } from "@/components/CreateSessionForm";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewSessionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className="shell">
      <AppHeader userName={user.name} />
      <CreateSessionForm knownUsers={users} />
    </main>
  );
}
