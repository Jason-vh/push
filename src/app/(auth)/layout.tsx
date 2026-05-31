export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-editorial">
        <div className="brand-blob">P</div>
        {children}
      </section>
    </main>
  );
}
