import { PrismaClient, Team } from "@prisma/client";

const prisma = new PrismaClient();

// First 4 are fictional friends. The 5th slot is replaced at runtime by the
// real logged-in user (detected via WebAuthnCredential, or overridden with
// SEED_ME_NAME) so the dashboard's "Best teammate" / "Toughest opponent"
// callouts have data to display.
const FRIEND_NAMES = [
  "Mateo Rivera",
  "Imani Okafor",
  "Priya Vance",
  "Sasha Lin",
];
const FALLBACK_ME_NAME = "You";

const SESSIONS: Array<{
  daysAgo: number;
  venue: string;
  // Each match: [team A pair indices, team B pair indices, team A score, team B score].
  // Indices reference PLAYER_NAMES; the winner follows the score.
  matches: Array<[number, number, number, number, number, number]>;
}> = [
  {
    daysAgo: 21,
    venue: "Padelhuset Nørrebro",
    matches: [
      [0, 1, 2, 3, 6, 3],
      [0, 2, 1, 3, 4, 6],
      [3, 4, 0, 1, 7, 5],
      [0, 3, 2, 4, 6, 2],
      [1, 4, 0, 2, 3, 6],
    ],
  },
  {
    daysAgo: 14,
    venue: "Padelklub Vest",
    matches: [
      [0, 1, 3, 4, 6, 4],
      [0, 4, 1, 2, 5, 7],
      [2, 3, 0, 1, 2, 6],
      [1, 3, 2, 4, 6, 1],
      [0, 2, 3, 4, 7, 6],
      [1, 4, 0, 3, 4, 6],
    ],
  },
  {
    daysAgo: 7,
    venue: "Padelhuset Nørrebro",
    matches: [
      [0, 1, 2, 4, 6, 4],
      [1, 2, 0, 3, 6, 0],
      [3, 4, 0, 2, 3, 6],
      [0, 4, 1, 3, 7, 5],
      [2, 3, 1, 4, 6, 3],
      [0, 3, 2, 4, 4, 6],
      [1, 4, 0, 2, 2, 6],
    ],
  },
  {
    daysAgo: 1,
    venue: "Padelhuset Nørrebro",
    matches: [
      [0, 2, 1, 3, 6, 2],
      [0, 1, 3, 4, 5, 7],
      [2, 4, 0, 3, 6, 4],
      [1, 2, 0, 4, 6, 5],
    ],
  },
];

async function resolveMe(): Promise<{ id: string; name: string }> {
  // 1) Explicit override
  const override = process.env.SEED_ME_NAME?.trim();
  if (override) {
    const user = await prisma.user.findFirst({ where: { name: override } });
    if (user) return user;
    return prisma.user.create({ data: { name: override } });
  }

  // 2) The first user with a registered passkey is "me"
  const credentialed = await prisma.user.findFirst({
    where: { credentials: { some: {} } },
    orderBy: { createdAt: "asc" },
  });
  if (credentialed) return credentialed;

  // 3) No real account yet — create a placeholder so the seed still works
  const existing = await prisma.user.findFirst({ where: { name: FALLBACK_ME_NAME } });
  if (existing) return existing;
  return prisma.user.create({ data: { name: FALLBACK_ME_NAME } });
}

async function main() {
  const me = await resolveMe();
  console.log(`Seeding for "me" = ${me.name} (${me.id})`);

  const friends = await Promise.all(
    FRIEND_NAMES.map(async (name) => {
      const found = await prisma.user.findFirst({ where: { name } });
      return found ?? (await prisma.user.create({ data: { name } }));
    }),
  );
  // Remove any leftover "Jason Wu" placeholder from earlier seed runs so it
  // doesn't clutter the leaderboard. Safe because nothing references it once
  // the seeded sessions are reset below.
  const legacy = await prisma.user.findFirst({ where: { name: "Jason Wu" } });

  const userByIndex = [...friends, me];

  for (const session of SESSIONS) {
    const playedAt = new Date();
    playedAt.setDate(playedAt.getDate() - session.daysAgo);
    playedAt.setHours(18, 30, 0, 0);

    const dayStart = new Date(playedAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(playedAt);
    dayEnd.setHours(23, 59, 59, 999);

    // Wipe any prior seeded session for this venue+day so re-running the seed
    // produces a fresh, consistent dataset (now with the real user in it).
    const prior = await prisma.gameSession.findMany({
      where: {
        venue: session.venue,
        playedAt: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true },
    });
    if (prior.length > 0) {
      const priorIds = prior.map((s) => s.id);
      await prisma.match.deleteMany({ where: { sessionId: { in: priorIds } } });
      await prisma.sessionPlayer.deleteMany({ where: { sessionId: { in: priorIds } } });
      await prisma.gameSession.deleteMany({ where: { id: { in: priorIds } } });
    }

    const created = await prisma.gameSession.create({
      data: {
        playedAt,
        venue: session.venue,
        createdById: me.id,
        players: {
          create: userByIndex.map((u) => ({ userId: u.id })),
        },
      },
    });

    for (let i = 0; i < session.matches.length; i += 1) {
      const [a1, a2, b1, b2, teamAScore, teamBScore] = session.matches[i];
      await prisma.match.create({
        data: {
          sessionId: created.id,
          orderIndex: i + 1,
          teamAPlayer1Id: userByIndex[a1].id,
          teamAPlayer2Id: userByIndex[a2].id,
          teamBPlayer1Id: userByIndex[b1].id,
          teamBPlayer2Id: userByIndex[b2].id,
          teamAScore,
          teamBScore,
          winnerTeam: teamAScore > teamBScore ? Team.A : Team.B,
        },
      });
    }

    console.log(`Seeded ${session.venue} (${session.matches.length} matches)`);
  }

  if (legacy && legacy.id !== me.id) {
    const stillReferenced = await prisma.match.findFirst({
      where: {
        OR: [
          { teamAPlayer1Id: legacy.id },
          { teamAPlayer2Id: legacy.id },
          { teamBPlayer1Id: legacy.id },
          { teamBPlayer2Id: legacy.id },
        ],
      },
      select: { id: true },
    });
    if (!stillReferenced) {
      await prisma.sessionPlayer.deleteMany({ where: { userId: legacy.id } });
      await prisma.user.delete({ where: { id: legacy.id } });
      console.log("Removed legacy seed user: Jason Wu");
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
