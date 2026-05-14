import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { rpID } from "@/lib/config";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { credentials: true },
  });

  if (!user || user.credentials.length === 0) {
    return NextResponse.json({ error: "No passkey found for this email." }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.credentials.map((credential) => ({
      id: credential.credentialId,
      transports: credential.transports ? JSON.parse(credential.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  await prisma.authChallenge.deleteMany({
    where: { email, type: AuthChallengeType.AUTHENTICATION },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: user.id,
      email,
      type: AuthChallengeType.AUTHENTICATION,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return NextResponse.json({ challengeId: challenge.id, options });
}
