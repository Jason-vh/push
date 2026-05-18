import { PrismaClient, type Team } from "@prisma/client";

const prisma = new PrismaClient();

const PLAYER_NAMES = [
  "Mateo Rivera",
  "Imani Okafor",
  "Priya Vance",
  "Sasha Lin",
  "Jason Wu",
];

const SESSIONS: Array<{
  daysAgo: number;
  venue: string;
  courtNumber: string;
  // Each match: [team A pair indices, team B pair indices, winner ("A"|"B")]
  // indices reference PLAYER_NAMES.
  matches: Array<[number, number, number, number, Team]>;
}> = [
  {
    daysAgo: 21,
    venue: "Padelhuset Nørrebro",
    courtNumber: "3",
    matches: [
      [0, 1, 2, 3, "A"],
      [0, 2, 1, 3, "B"],
      [3, 4, 0, 1, "A"],
      [0, 3, 2, 4, "A"],
      [1, 4, 0, 2, "B"],
    ],
  },
  {
    daysAgo: 14,
    venue: "Padelklub Vest",
    courtNumber: "1",
    matches: [
      [0, 1, 3, 4, "A"],
      [0, 4, 1, 2, "B"],
      [2, 3, 0, 1, "B"],
      [1, 3, 2, 4, "A"],
      [0, 2, 3, 4, "A"],
      [1, 4, 0, 3, "B"],
    ],
  },
  {
    daysAgo: 7,
    venue: "Padelhuset Nørrebro",
    courtNumber: "3",
    matches: [
      [0, 1, 2, 4, "A"],
      [1, 2, 0, 3, "A"],
      [3, 4, 0, 2, "B"],
      [0, 4, 1, 3, "A"],
      [2, 3, 1, 4, "A"],
      [0, 3, 2, 4, "B"],
      [1, 4, 0, 2, "B"],
    ],
  },
  {
    daysAgo: 1,
    venue: "Padelhuset Nørrebro",
    courtNumber: "5",
    matches: [
      [0, 2, 1, 3, "A"],
      [0, 1, 3, 4, "B"],
      [2, 4, 0, 3, "A"],
      [1, 2, 0, 4, "A"],
    ],
  },
];

async function main() {
  const existingUsers = await prisma.user.findMany({
    where: { name: { in: PLAYER_NAMES } },
  });
  const byName = new Map(existingUsers.map((u) => [u.name, u]));
  for (const name of PLAYER_NAMES) {
    if (!byName.has(name)) {
      const created = await prisma.user.create({ data: { name } });
      byName.set(name, created);
    }
  }
  const userByIndex = PLAYER_NAMES.map((name) => byName.get(name)!);
  const creator = userByIndex[0];

  for (const session of SESSIONS) {
    const playedAt = new Date();
    playedAt.setDate(playedAt.getDate() - session.daysAgo);
    playedAt.setHours(18, 30, 0, 0);

    // Idempotent-ish: skip if a session by this creator at this venue exists for the same day.
    const dayStart = new Date(playedAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(playedAt);
    dayEnd.setHours(23, 59, 59, 999);
    const existing = await prisma.gameSession.findFirst({
      where: {
        venue: session.venue,
        playedAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (existing) {
      console.log(`Skipping existing session: ${session.venue} ${dayStart.toDateString()}`);
      continue;
    }

    const created = await prisma.gameSession.create({
      data: {
        playedAt,
        venue: session.venue,
        courtNumber: session.courtNumber,
        createdById: creator.id,
        players: {
          create: userByIndex.map((u) => ({ userId: u.id })),
        },
      },
    });

    for (let i = 0; i < session.matches.length; i += 1) {
      const [a1, a2, b1, b2, winner] = session.matches[i];
      await prisma.match.create({
        data: {
          sessionId: created.id,
          orderIndex: i + 1,
          teamAPlayer1Id: userByIndex[a1].id,
          teamAPlayer2Id: userByIndex[a2].id,
          teamBPlayer1Id: userByIndex[b1].id,
          teamBPlayer2Id: userByIndex[b2].id,
          winnerTeam: winner,
        },
      });
    }

    console.log(`Seeded ${session.venue} (${session.matches.length} matches)`);
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
