import { useAuth } from '../../auth/state/AuthContext';

export function AppHomePage() {
  const { user, logout } = useAuth();

  return (
    <section className="card">
      <h2>Zaštićeni app shell</h2>
      <p>Prijavljen korisnik: <strong>{user?.username}</strong> ({user?.role})</p>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </section>
  );
}
