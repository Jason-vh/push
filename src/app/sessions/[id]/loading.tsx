export default function SessionLoading() {
  return (
    <main className="shell" aria-busy="true">
      <header className="session-header">
        <div className="session-header-main">
          <span className="skeleton" style={{ width: 160, height: 26 }} />
        </div>
        <div className="session-meta">
          <span className="skeleton" style={{ width: 110, height: 13 }} />
          <span className="skeleton" style={{ width: 200, height: 13 }} />
        </div>
      </header>

      <section className="session-section">
        <span className="skeleton" style={{ width: 120, height: 18, margin: "0 4px 12px" }} />
        <span className="skeleton" style={{ width: "100%", height: 260, borderRadius: 22 }} />
      </section>

      <section className="session-section">
        <span className="skeleton" style={{ width: 90, height: 18, margin: "0 4px 12px" }} />
        <div className="session-matches">
          <span className="skeleton" style={{ width: "100%", height: 52, borderRadius: 18 }} />
          <span className="skeleton" style={{ width: "100%", height: 86, borderRadius: 18 }} />
        </div>
      </section>
    </main>
  );
}
