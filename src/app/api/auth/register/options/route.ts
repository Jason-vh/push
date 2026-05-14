import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeEmail, nameFromEmail } from "@/lib/email";
import { rpID, rpName } from "@/lib/config";

const schema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || nameFromEmail(email);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: { name },
    include: { credentials: true },
  });

  if (user.credentials.length > 0) {
    return NextResponse.json(
      { error: "This email already has a passkey. Sign in instead." },
      { status: 409 },
    );
  }

  await prisma.player.upsert({
    where: { email },
    create: { email, name, userId: user.id },
    update: { name, userId: user.id },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: email,
    userDisplayName: name,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await prisma.authChallenge.deleteMany({
    where: { email, type: AuthChallengeType.REGISTRATION },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: user.id,
      email,
      type: AuthChallengeType.REGISTRATION,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return NextResponse.json({ challengeId: challenge.id, options });
}
