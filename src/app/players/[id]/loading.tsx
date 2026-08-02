export default function PlayerLoading() {
  return (
    <main className="shell" aria-busy="true">
      <header className="profile-head">
        <span className="skeleton circle" style={{ width: 54, height: 54 }} />
        <div>
          <span className="skeleton" style={{ width: 150, height: 22 }} />
          <div style={{ marginTop: 8 }}>
            <span className="skeleton" style={{ width: 110, height: 12 }} />
          </div>
        </div>
      </header>

      <span
        className="skeleton"
        style={{ display: "block", height: 110, borderRadius: 28, marginBottom: 14 }}
      />

      <div className="stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="skeleton" style={{ height: 64, borderRadius: 18 }} />
        ))}
      </div>

      <span
        className="skeleton"
        style={{ display: "block", height: 140, borderRadius: 22, marginTop: 14 }}
      />
    </main>
  );
}
