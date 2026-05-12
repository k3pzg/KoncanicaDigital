import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/state/AuthContext';

const NAV_ITEMS = [
  { label: 'Karta', to: '/app/map' },
  { label: 'Vodni objekti', to: '/app/water-objects' },
  { divider: true },
  { section: 'Riblji fond' },
  { label: 'Pregled fonda', to: '/app/fish-stock' },
  { label: 'Poribljavanje', to: '/app/fish-entry/new' },
  { label: 'Izlov', to: '/app/izlov' },
  { label: 'Kontrola', to: '/app/fish' },
  { divider: true },
  { section: 'Operacije' },
  { label: 'Vodostaji', to: '/app/map' },
  { label: 'Hranjenje', to: '/app/hranjenje' },
];

export function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleToggle() {
    if (window.innerWidth < 768) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const sidebarClass = [
    'app-sidebar',
    collapsed ? 'app-sidebar--collapsed' : '',
    mobileOpen ? 'app-sidebar--mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={handleToggle}
          aria-label="Izbornik"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="app-header-brand">
          <h1>
            <Link to="/app/map" className="app-header-home-link">
              KoncanicaDigital
            </Link>
          </h1>
        </div>
        {user && (
          <div className="app-header-user">
            <span className="app-header-username">{user.username}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
              Odjava
            </button>
          </div>
        )}
      </header>

      <div className="app-body">
        {mobileOpen && (
          <div
            className="sidebar-backdrop sidebar-backdrop--visible"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <nav className={sidebarClass} aria-label="Glavna navigacija">
          <div className="app-sidebar-nav">
            {NAV_ITEMS.map((item, index) => {
              if (item.divider) {
                return <div key={`div-${index}`} className="app-sidebar-divider" />;
              }
              if (item.section) {
                return (
                  <div key={`sec-${index}`} className="app-sidebar-section-label">
                    {item.section}
                  </div>
                );
              }
              if (item.soon) {
                return (
                  <span key={item.label} className="app-sidebar-link app-sidebar-link--disabled">
                    {item.label}
                  </span>
                );
              }
              return (
                <NavLink
                  key={`${item.label}-${item.to}`}
                  to={item.to}
                  className={({ isActive }) =>
                    ['app-sidebar-link', isActive ? 'active' : ''].filter(Boolean).join(' ')
                  }
                  onClick={closeMobile}
                  end={item.to === '/app/map'}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
