export function LoginPage() {
  return (
    <section className="card">
      <h2>Login (Placeholder)</h2>
      <p>Ovo je minimalni ekran za autentikaciju i služi kao početni placeholder.</p>
      <form className="login-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Email
          <input type="email" placeholder="email@example.com" disabled />
        </label>
        <label>
          Lozinka
          <input type="password" placeholder="••••••••" disabled />
        </label>
        <button type="submit" disabled>
          Prijava (uskoro)
        </button>
      </form>
    </section>
  );
}
