export default function HomeLoading() {
  return (
    <main className="shell" aria-busy="true">
      <div className="rating-hero" style={{ marginBottom: 14 }}>
        <div className="hero-body">
          <div className="hero-label" style={{ opacity: 0 }}>YOUR RATING</div>
          <span
            className="skeleton on-dark"
            style={{ display: "inline-block", width: 132, height: 52, marginTop: 4 }}
          />
        </div>
        <span
          className="skeleton on-dark"
          style={{ width: 72, height: 22, borderRadius: 999 }}
        />
      </div>

      <div className="leaderboard">
        <h2>Leaderboard</h2>
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="lb-row" key={i}>
            <span className="skeleton" style={{ width: 14, height: 14, margin: "0 auto" }} />
            <span className="skeleton circle" style={{ width: 28, height: 28 }} />
            <div style={{ minWidth: 0 }}>
              <span className="skeleton" style={{ width: 110, height: 14 }} />
              <span
                className="skeleton"
                style={{ width: 56, height: 10, marginTop: 6 }}
              />
            </div>
            <span className="skeleton" style={{ width: 36, height: 16 }} />
          </div>
        ))}
      </div>

      <section style={{ marginTop: 22 }}>
        <div className="section-head">
          <h2>Recent sessions</h2>
          <span
            className="skeleton"
            style={{ width: 68, height: 30, borderRadius: 999 }}
          />
        </div>
        <div className="session-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="session-row" key={i}>
              <span
                className="skeleton"
                style={{ width: 44, height: 44, borderRadius: 12 }}
              />
              <div style={{ minWidth: 0 }}>
                <span className="skeleton" style={{ width: 120, height: 14 }} />
                <span
                  className="skeleton"
                  style={{ width: 80, height: 10, marginTop: 6 }}
                />
              </div>
              <span
                className="skeleton"
                style={{ width: 52, height: 24, borderRadius: 999 }}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
