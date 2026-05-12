import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/state/AuthContext';

export function MainLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <h1><Link to="/app/map" className="app-header-home-link">KoncanicaDigital</Link></h1>
        </div>
        {user && (
          <div className="app-header-user">
            <span className="app-header-username">{user.username}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={logout}
            >
              Odjava
            </button>
          </div>
        )}
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
