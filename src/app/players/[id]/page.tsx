import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CalloutRow, shortName } from "@/components/CalloutRow";
import { RatingSparkline } from "@/components/RatingSparkline";
import { SessionRow } from "@/components/SessionRow";
import { prisma } from "@/lib/db";
import { displayRating } from "@/lib/elo";
import {
  bestTeammate,
  computeRatings,
  currentStreak,
  getCachedOrderedMatches,
  opponentRecords,
  partnerRecords,
  playerResults,
  rankPlayers,
  ratingHistory,
  statsFor,
  summarizeSession,
  toughestOpponent,
  type MatchInput,
  type PairRecord,
  type Winner,
} from "@/lib/ratings";
import { getCurrentUser } from "@/lib/session";

const PAIRS_SHOWN = 3;
const FORM_LENGTH = 10;

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const sessionsWhere = { deletedAt: null, players: { some: { userId: id } } };
  const [player, users, orderedMatches, sessions, sessionCount] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
    getCachedOrderedMatches(),
    prisma.gameSession.findMany({
      where: sessionsWhere,
      take: 5,
      orderBy: { playedAt: "desc" },
      include: {
        matches: {
          select: {
            id: true,
            winnerTeam: true,
            teamAPlayer1Id: true,
            teamAPlayer2Id: true,
            teamBPlayer1Id: true,
            teamBPlayer2Id: true,
          },
        },
      },
    }),
    prisma.gameSession.count({ where: sessionsWhere }),
  ]);

  if (!player) notFound();

  const isMe = player.id === viewer.id;
  const { stats, byMatch } = computeRatings(orderedMatches);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const playerStats = statsFor(stats, player.id);
  const rank = rankPlayers(users, stats).find((entry) => entry.id === player.id)?.rank ?? null;

  const results = playerResults(orderedMatches, player.id);
  const history = ratingHistory(orderedMatches, byMatch, player.id);
  const streak = currentStreak(results);
  const played = playerStats.wins + playerStats.losses;
  const winRate = played === 0 ? 0 : Math.round((playerStats.wins * 100) / played);

  const teammate = bestTeammate(orderedMatches, player.id);
  const opponent = toughestOpponent(orderedMatches, player.id);
  const partners = partnerRecords(orderedMatches, player.id).slice(0, PAIRS_SHOWN);
  const opponents = opponentRecords(orderedMatches, player.id).slice(0, PAIRS_SHOWN);

  return (
    <main className="shell">
      <header className="profile-head">
        <Avatar name={player.name} size={54} />
        <div style={{ minWidth: 0 }}>
          <h1 className="profile-name">{player.name}</h1>
          <div className="profile-sub">
            {isMe ? "That's you · " : ""}
            {played} {played === 1 ? "match" : "matches"} · {sessionCount}{" "}
            {sessionCount === 1 ? "session" : "sessions"}
          </div>
        </div>
      </header>

      <div className="rating-hero" style={{ marginBottom: 14 }}>
        <div className="hero-body">
          <div className="hero-label">{isMe ? "YOUR RATING" : "RATING"}</div>
          <div className="hero-rating">{displayRating(playerStats.rating)}</div>
        </div>
        <div className="hero-rank">{rank ? `Rank #${rank}` : "Unranked"}</div>
      </div>

      <div className="stat-grid">
        <StatTile label="Won" value={String(playerStats.wins)} tone="positive" />
        <StatTile label="Lost" value={String(playerStats.losses)} tone="negative" />
        <StatTile label="Win rate" value={`${winRate}%`} />
        <StatTile
          label="Streak"
          value={streak === 0 ? "–" : `${streak > 0 ? "W" : "L"}${Math.abs(streak)}`}
          tone={streak > 0 ? "positive" : streak < 0 ? "negative" : undefined}
        />
      </div>

      <section className="card-panel">
        <div className="panel-head">
          <h2>Rating over time</h2>
          <span className="panel-note">
            {played === 0 ? "No matches yet" : `${played} matches`}
          </span>
        </div>
        <RatingSparkline values={history} label={`${player.name}'s rating over time`} />
        {results.length > 0 ? (
          <div className="form-row">
            <span className="form-label">FORM</span>
            <span className="form-pips">
              {results.slice(-FORM_LENGTH).map((won, index) => (
                <span key={index} className={`form-pip ${won ? "win" : "loss"}`} />
              ))}
            </span>
          </div>
        ) : null}
      </section>

      {teammate || opponent ? (
        <div className="callout-card" style={{ marginTop: 14 }}>
          {teammate ? (
            <CalloutRow
              title="Best teammate"
              record={teammate}
              name={usersById.get(teammate.otherUserId)?.name ?? null}
              tone="positive"
              href={`/players/${teammate.otherUserId}`}
            />
          ) : null}
          {teammate && opponent ? <div className="callout-sep" /> : null}
          {opponent ? (
            <CalloutRow
              title="Toughest opponent"
              record={opponent}
              name={usersById.get(opponent.otherUserId)?.name ?? null}
              tone="negative"
              href={`/players/${opponent.otherUserId}`}
            />
          ) : null}
        </div>
      ) : null}

      {partners.length > 0 ? (
        <PairPanel title="Plays best with" records={partners} usersById={usersById} />
      ) : null}
      {opponents.length > 0 ? (
        <PairPanel title="Beats most often" records={opponents} usersById={usersById} />
      ) : null}

      <section style={{ marginTop: 22 }}>
        <div className="section-head">
          <h2>Recent sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="empty">No sessions yet.</div>
        ) : (
          <div className="session-list">
            {sessions.map((session) => {
              const summary = summarizeSession(
                session.matches.map(toMatchInput),
                byMatch,
                player.id,
              );
              return (
                <SessionRow
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  playedAt={session.playedAt}
                  venue={session.venue}
                  results={summary}
                  delta={summary.delta}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function toMatchInput(match: {
  id: string;
  winnerTeam: string;
  teamAPlayer1Id: string;
  teamAPlayer2Id: string;
  teamBPlayer1Id: string;
  teamBPlayer2Id: string;
}): MatchInput {
  return { ...match, winnerTeam: match.winnerTeam as Winner };
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${tone ? ` ${tone}` : ""}`}>{value}</div>
    </div>
  );
}

function PairPanel({
  title,
  records,
  usersById,
}: {
  title: string;
  records: PairRecord[];
  usersById: Map<string, { id: string; name: string }>;
}) {
  return (
    <section className="card-panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      {records.map((record) => {
        const other = usersById.get(record.otherUserId);
        return (
          <Link
            className="pair-row"
            key={record.otherUserId}
            href={`/players/${record.otherUserId}`}
          >
            <Avatar name={other?.name ?? "?"} size={28} />
            <div style={{ minWidth: 0 }}>
              <div className="pair-name">{other ? shortName(other.name) : "Unknown"}</div>
              <div className="lb-wl">
                <span className="w">{record.wins}W</span>
                <span className="sep"> · </span>
                <span className="l">{record.losses}L</span>
              </div>
            </div>
            <div className="pair-rate">{record.winRate}%</div>
          </Link>
        );
      })}
    </section>
  );
}
