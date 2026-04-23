import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login({ username, password });
    } catch (submitError) {
      setError(submitError.message || 'Prijava nije uspjela');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Prijava</h2>
      <p>Prijava u osnovno zaštićeno sučelje.</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Korisničko ime
          <input
            type="text"
            placeholder="admin"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          Lozinka
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Prijava...' : 'Prijava'}
        </button>
      </form>
    </section>
  );
}
