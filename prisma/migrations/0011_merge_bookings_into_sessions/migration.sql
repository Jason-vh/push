ALTER TABLE "GameSession" ADD COLUMN "startTime" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "GameSession" ADD COLUMN "court" TEXT;

-- Bookings become sessions; a day that already has a session only gets its time and court.
UPDATE "GameSession" AS s
SET "startTime" = b."startTime",
    "durationMinutes" = b."durationMinutes",
    "court" = b."court"
FROM "Booking" AS b
WHERE s."deletedAt" IS NULL
  AND s."playedAt"::date = b."date";

INSERT INTO "GameSession" ("id", "playedAt", "venue", "startTime", "durationMinutes", "court", "createdById", "createdAt", "updatedAt")
SELECT b."id", b."date"::timestamp, b."venue", b."startTime", b."durationMinutes", b."court", b."bookedById", b."createdAt", b."updatedAt"
FROM "Booking" AS b
WHERE NOT EXISTS (
  SELECT 1 FROM "GameSession" AS s
  WHERE s."deletedAt" IS NULL AND s."playedAt"::date = b."date"
);

INSERT INTO "SessionPlayer" ("id", "sessionId", "userId", "createdAt")
SELECT bp."id", bp."bookingId", bp."userId", CURRENT_TIMESTAMP
FROM "BookingPlayer" AS bp
JOIN "GameSession" AS s ON s."id" = bp."bookingId";

ALTER TABLE "Booking" DROP CONSTRAINT "Booking_bookedById_fkey";
ALTER TABLE "BookingPlayer" DROP CONSTRAINT "BookingPlayer_bookingId_fkey";
ALTER TABLE "BookingPlayer" DROP CONSTRAINT "BookingPlayer_userId_fkey";

DROP TABLE "BookingPlayer";
DROP TABLE "Booking";
