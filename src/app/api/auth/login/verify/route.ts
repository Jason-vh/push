import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
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

  const challenge = await prisma.authChallenge.findUnique({ where: { id: input.challengeId } });
  if (
    !challenge ||
    challenge.type !== AuthChallengeType.AUTHENTICATION ||
    challenge.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Sign-in challenge expired." }, { status: 400 });
  }

  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: input.response.id },
    include: { user: true },
  });

  if (!credential || credential.user.email !== challenge.email) {
    return NextResponse.json({ error: "Passkey does not match this email." }, { status: 400 });
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: new Uint8Array(credential.publicKey),
      counter: Number(credential.counter),
      transports: credential.transports ? JSON.parse(credential.transports) : undefined,
    },
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey sign-in failed." }, { status: 400 });
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  await prisma.authChallenge.delete({ where: { id: challenge.id } });
  await createSession(credential.user.id);

  return NextResponse.json({ ok: true });
}
