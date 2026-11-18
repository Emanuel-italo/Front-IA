import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../store/AppStore";
import { useSavedAlerts } from "../store/alerts";
import { Icon, type IconName } from "./Icon";

export function RequireAuth() {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

export function Logo() {
  return (
    <span className="logo">
      <img src="/icon.svg" alt="" width={28} height={28} />
      Rota Leve
    </span>
  );
}

export function AppLayout() {
  const alerts = useSavedAlerts();
  const count = alerts.reduce((n, a) => n + a.problems.length, 0);
  const tabs: { to: string; icon: IconName; text: string; end?: boolean; badge?: number }[] = [
    { to: "/", icon: "search", text: "Buscar", end: true },
    { to: "/relatos", icon: "flag", text: "Relatos" },
    { to: "/minhas-rotas", icon: "bookmark", text: "Minhas rotas", badge: count },
    { to: "/perfil", icon: "user", text: "Perfil" },
  ];
  return (
    <div className="app">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      {/* No celular vira barra inferior; no computador, barra superior (ver .navbar no CSS). */}
      <nav className="navbar" aria-label="Navegação principal">
        <Link to="/" className="navbar-brand" aria-label="Rota Leve, início">
          <Logo />
        </Link>
        <div className="navbar-tabs">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
              <span className="tab-icon">
                <Icon name={t.icon} size={22} />
                {!!t.badge && <span className="badge" aria-hidden>{t.badge}</span>}
              </span>
              <span>{t.text}</span>
              {!!t.badge && <span className="sr-only">({t.badge} alertas)</span>}
            </NavLink>
          ))}
        </div>
      </nav>
      <main id="conteudo" className="content">
        <Outlet />
      </main>
    </div>
  );
}
