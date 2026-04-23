import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';

export function AppHomePage() {
  const { user, logout } = useAuth();

  return (
    <section className="card">
      <h2>Zaštićeno sučelje aplikacije</h2>
      <p>Prijavljen korisnik: <strong>{user?.username}</strong> ({user?.role})</p>
      <p>
        <Link to="/app/water-objects">Otvori modul Vodni objekti</Link>
      </p>
      <p>
        <Link to="/app/fish">Otvori modul Riba - faza 1</Link>
      </p>
      <button type="button" onClick={logout}>
        Odjava
      </button>
    </section>
  );
}
