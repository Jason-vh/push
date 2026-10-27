import { LogMatchButton } from "@/components/LogMatchButton";
import { MatchCard, type MatchCardData, type ViewerResult } from "@/components/MatchCard";

const PLAYERS_FOR_A_MATCH = 4;

export type SessionMatchEntry = {
  match: MatchCardData;
  gameNumber: number;
  viewerResult: ViewerResult;
};

export function SessionMatches({
  sessionId,
  attendees,
  entries,
  userId,
}: {
  sessionId: string;
  attendees: Array<{ id: string; name: string }>;
  entries: SessionMatchEntry[];
  userId: string;
}) {
  const canLog = attendees.length >= PLAYERS_FOR_A_MATCH;
  return (
    <section className="session-section">
      <div className="section-head">
        <h2>Matches</h2>
        {entries.length > 0 ? <span className="section-aside">{entries.length} played</span> : null}
      </div>
      <div className="session-matches">
        {canLog ? (
          <LogMatchButton sessionId={sessionId} attendees={attendees} />
        ) : (
          <div className="empty compact">Add four players under Edit to log a match.</div>
        )}
        {entries.map((entry) => (
          <MatchCard
            key={entry.match.id}
            sessionId={sessionId}
            attendees={attendees}
            match={entry.match}
            gameNumber={entry.gameNumber}
            userId={userId}
            viewerResult={entry.viewerResult}
          />
        ))}
      </div>
    </section>
  );
}
