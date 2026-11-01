import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { schedulePlayerInvites } from "@/lib/invites/sync";
import { getCurrentUser } from "@/lib/session";

const profileSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value || null)
    .pipe(z.email("That doesn't look like an email address.").max(254).nullable()),
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = profileSchema.parse(await request.json());
    if (input.email !== user.email) {
      await prisma.user.update({ where: { id: user.id }, data: { email: input.email } });
      await schedulePlayerInvites(user.id);
    }

    return NextResponse.json({ ok: true, email: input.email });
  } catch (error) {
    let message = "Could not save";
    if (error instanceof z.ZodError) message = error.issues[0]?.message ?? message;
    else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      message = "Another player already uses that email.";
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
