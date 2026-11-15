import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../store/AppStore";
import { useSavedAlerts } from "../store/alerts";

export function RequireAuth() {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

export function AppLayout() {
  const alerts = useSavedAlerts();
  const count = alerts.reduce((n, a) => n + a.problems.length, 0);
  const tabs = [
    { to: "/", icon: "🧭", text: "Buscar", end: true },
    { to: "/relatos", icon: "📣", text: "Relatos" },
    { to: "/minhas-rotas", icon: "⭐", text: "Minhas rotas", badge: count },
    { to: "/perfil", icon: "👤", text: "Perfil" },
  ];
  return (
    <div className="app">
      <a href="#conteudo" className="skip">Pular para o conteúdo</a>
      <main id="conteudo" className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Navegação principal">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
            <span className="tab-icon" aria-hidden>
              {t.icon}
              {!!t.badge && <span className="badge">{t.badge}</span>}
            </span>
            <span>{t.text}</span>
            {!!t.badge && <span className="sr-only">({t.badge} alertas)</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
