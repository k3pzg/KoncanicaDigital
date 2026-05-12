import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/state/AuthContext';

const navigationCards = [
  {
    title: 'Karta ribnjaka',
    description: 'Satelitska karta svih ribnjaka s prikazom vodostaja i stanja ribe.',
    to: '/app/map',
    primary: true
  },
  {
    title: 'Vodni objekti',
    description: 'Popis svih ribnjaka. Kliknite "Detalji" za povijest, vodostaj i fond.',
    to: '/app/water-objects'
  },
  {
    title: 'Stanje ribljeg fonda',
    description: 'Pregled trenutnog fonda ribe po objektu, vrsti i kategoriji.',
    to: '/app/fish-stock'
  },
  {
    title: 'Novo poribljavanje',
    description: 'Unos nasada ili premještaja ribe u ribnjak.',
    to: '/app/fish-entry/new'
  },
  {
    title: 'Novi izlov',
    description: 'Evidencija izlova i premještaja ribe iz ribnjaka.',
    to: '/app/fish-stock'
  },
  {
    title: 'Nova kontrola',
    description: 'Unos kontrolnog uzorkovanja i procjene broja ribe.',
    to: '/app/fish'
  }
];

export function AppHomePage() {
  const { user } = useAuth();

  return (
    <section className="card app-home-card">
      <div className="app-home-header">
        <div>
          <h2 style={{ margin: 0 }}>Operativni dashboard</h2>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Prijavljen: <strong>{user?.username}</strong> &middot; {user?.role}
          </p>
        </div>
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
