import { Link } from 'react-router-dom';

export function MainLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1><Link to="/app/map" className="app-header-home-link">KoncanicaDigital</Link></h1>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
