export default function NewSessionLoading() {
  return (
    <main className="shell" aria-busy="true">
      <div className="card stack">
        <h2>Create session</h2>
        <span className="skeleton" style={{ width: "100%", height: 44, marginTop: 12 }} />
        <span className="skeleton" style={{ width: "100%", height: 44, marginTop: 12 }} />
        <span className="skeleton" style={{ width: "100%", height: 80, marginTop: 12 }} />
        <span
          className="skeleton"
          style={{ width: "100%", height: 48, marginTop: 16, borderRadius: 16 }}
        />
      </div>
    </main>
  );
}
