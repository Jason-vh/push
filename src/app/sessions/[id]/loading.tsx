export default function SessionLoading() {
  return (
    <main className="shell" aria-busy="true">
      <header className="session-header">
        <span className="skeleton" style={{ width: 180, height: 24 }} />
        <div style={{ marginTop: 8 }}>
          <span className="skeleton" style={{ width: 120, height: 12 }} />
        </div>
      </header>

      <div className="roster-strip">
        <div className="roster-stack">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="skeleton circle"
              style={{ width: 28, height: 28, marginLeft: i === 0 ? 0 : -10 }}
            />
          ))}
        </div>
        <span className="skeleton" style={{ width: 90, height: 12 }} />
        <span
          className="skeleton"
          style={{ width: 44, height: 22, marginLeft: "auto", borderRadius: 999 }}
        />
      </div>

      <section className="timeline">
        <div className="timeline-spine" aria-hidden />

        <div className="timeline-row first">
          <span
            className="skeleton"
            style={{ width: "100%", height: 52, borderRadius: 18 }}
          />
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <div className="timeline-row" key={i}>
            <span
              className="skeleton"
              style={{ width: "100%", height: 64, borderRadius: 18 }}
            />
          </div>
        ))}
      </section>
    </main>
  );
}
