import { NextResponse } from "next/server";
import { AuthChallengeType } from "@prisma/client";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { rpID } from "@/lib/config";

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      type: AuthChallengeType.AUTHENTICATION,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return NextResponse.json({ challengeId: challenge.id, options });
}
