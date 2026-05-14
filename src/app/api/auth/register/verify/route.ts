import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { z } from "zod";
import { expectedOrigin, rpID } from "@/lib/config";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const schema = z.object({
  challengeId: z.string(),
  response: z.any(),
});

export async function POST(request: Request) {
  const input = schema.parse(await request.json());

  const challenge = await prisma.authChallenge.findUnique({
    where: { id: input.challengeId },
    include: { user: true },
  });

  if (
    !challenge ||
    challenge.type !== AuthChallengeType.REGISTRATION ||
    !challenge.user ||
    challenge.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Registration challenge expired." }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey registration failed." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      userId: challenge.user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: JSON.stringify(
        credential.transports ?? input.response.response?.transports ?? [],
      ),
    },
  });

  await prisma.authChallenge.delete({ where: { id: challenge.id } });
  await createSession(challenge.user.id);

  return NextResponse.json({ ok: true });
}
