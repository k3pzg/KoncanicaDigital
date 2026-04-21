export function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>KoncanicaDigital</h1>
        <p>Čisti temelj aplikacije</p>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
