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
  });

  if (
    !challenge ||
    challenge.type !== AuthChallengeType.REGISTRATION ||
    !challenge.pendingName ||
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
    return NextResponse.json({ error: "Account creation failed." }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name: challenge.pendingName! } });
    await tx.webAuthnCredential.create({
      data: {
        userId: created.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: JSON.stringify(
          credential.transports ?? input.response.response?.transports ?? [],
        ),
      },
    });
    await tx.authChallenge.delete({ where: { id: challenge.id } });
    return created;
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
