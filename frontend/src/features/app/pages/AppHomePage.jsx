import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';

const navigationCards = [
  {
    title: 'Karta ribnjaka',
    description: 'Primarni operativni ekran sa satelitskom kartom, objektima i stanjem fonda.',
    to: '/app/map',
    primary: true
  },
  {
    title: 'Vodni objekti',
    description: 'Pregled i uređivanje šifri, površina, dubina, volumena i geometrije.',
    to: '/app/water-objects'
  },
  {
    title: 'Stanje ribljeg fonda',
    description: 'Tablični pregled ribe po objektu, vrsti i kategoriji.',
    to: '/app/fish-stock'
  },
  {
    title: 'Novo poribljavanje',
    description: 'Unos novog nasada ili dodatnog poribljavanja.',
    to: '/app/fish-entry/new'
  },
  {
    title: 'Novi izlov',
    description: 'Evidencija izlova kroz obrazac na pregledu stanja fonda.',
    to: '/app/fish-stock'
  },
  {
    title: 'Nova kontrola',
    description: 'Unos kontrolnog uzorkovanja i procjene po vrstama.',
    to: '/app/fish'
  },
  {
    title: 'Premještaj ribe',
    description: 'Evidencija premještaja kroz postojeći modul ribe faze 1.',
    to: '/app/fish'
  }
];

export function AppHomePage() {
  const { user, logout } = useAuth();

  return (
    <section className="card app-home-card">
      <div className="app-home-header">
        <div>
          <h2>Operativni dashboard</h2>
          <p>Prijavljen korisnik: <strong>{user?.username}</strong> ({user?.role})</p>
        </div>
        <button type="button" onClick={logout}>Odjava</button>
      </div>

      <p className="app-home-lead">
        Za rad nakon prijave otvorite kartu ribnjaka kao glavni ekran ili odaberite jednu od brzih akcija.
      </p>

      <div className="app-home-nav-grid">
        {navigationCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={card.primary ? 'app-home-nav-card primary' : 'app-home-nav-card'}
          >
            <span>{card.title}</span>
            <small>{card.description}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
