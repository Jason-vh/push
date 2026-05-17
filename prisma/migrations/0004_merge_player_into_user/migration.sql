-- Drop foreign keys that point to Player so we can drop the table
ALTER TABLE "SessionPlayer" DROP CONSTRAINT "SessionPlayer_playerId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamAPlayer1Id_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamAPlayer2Id_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamBPlayer1Id_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamBPlayer2Id_fkey";
ALTER TABLE "RatingChange" DROP CONSTRAINT "RatingChange_playerId_fkey";

DROP TABLE "Player";

-- Rename SessionPlayer.playerId -> userId, swap unique index
DROP INDEX "SessionPlayer_sessionId_playerId_key";
ALTER TABLE "SessionPlayer" RENAME COLUMN "playerId" TO "userId";
CREATE UNIQUE INDEX "SessionPlayer_sessionId_userId_key" ON "SessionPlayer"("sessionId", "userId");

-- Rename RatingChange.playerId -> userId, swap unique index
DROP INDEX "RatingChange_matchId_playerId_key";
ALTER TABLE "RatingChange" RENAME COLUMN "playerId" TO "userId";
CREATE UNIQUE INDEX "RatingChange_matchId_userId_key" ON "RatingChange"("matchId", "userId");

-- User: drop email, add rating/active, make name NOT NULL
DROP INDEX "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000;
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "User" SET "name" = 'Player' WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- AuthChallenge: drop email
ALTER TABLE "AuthChallenge" DROP COLUMN "email";

-- Re-add foreign keys pointing to User
ALTER TABLE "SessionPlayer" ADD CONSTRAINT "SessionPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAPlayer1Id_fkey" FOREIGN KEY ("teamAPlayer1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAPlayer2Id_fkey" FOREIGN KEY ("teamAPlayer2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBPlayer1Id_fkey" FOREIGN KEY ("teamBPlayer1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBPlayer2Id_fkey" FOREIGN KEY ("teamBPlayer2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RatingChange" ADD CONSTRAINT "RatingChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
