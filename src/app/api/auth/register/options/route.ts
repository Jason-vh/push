import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rpID, rpName } from "@/lib/config";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const input = schema.parse(await request.json());
  const name = input.name.trim();

  const user = await prisma.user.create({ data: { name } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: name,
    userDisplayName: name,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: user.id,
      type: AuthChallengeType.REGISTRATION,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return NextResponse.json({ challengeId: challenge.id, options });
}
