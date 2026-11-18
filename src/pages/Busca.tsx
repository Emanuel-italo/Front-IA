import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { DESTINATION, ORIGIN, PROFILES } from "../data/catalog";
import { toApiReports, useApp } from "../store/AppStore";
import { Alert, Spinner } from "../components/ui";
import { Icon } from "../components/Icon";

export function Busca() {
  const { user, reports, setLastSearch } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [origin, setOrigin] = useState(ORIGIN.name);
  const [destination, setDestination] = useState(DESTINATION.name);
  const [loading, setLoading] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = PROFILES.find((p) => p.id === user?.profile);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (!user?.profile) return;
    if (!origin.trim() || !destination.trim()) return setError("Informe origem e destino.");
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) return setError("Origem e destino são iguais.");
    setError(null);
    setLoading(true);
    setWaking(false);
    // 502/504 na 1ª tentativa: o serviço está acordando; o cliente espera 5 s e tenta de novo.
    const wake = { onWaking: () => setWaking(true) };
    try {
      // Rotas candidatas: no sistema completo vêm da Google Directions (modo transit, alternativas) via API Java.
      // Aqui usamos o cenário de demonstração do próprio serviço de IA.
      const candidates = await api.demoRoutes(wake);
      const sentReports = toApiReports(reports);
      const result = await api.rank(user.profile, candidates, sentReports, true, wake);
      setLastSearch({ origin, destination, candidates, reports: sentReports, result });
      nav("/resultado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado ao buscar rotas.");
    } finally {
      setLoading(false);
      setWaking(false);
    }
  }

  useEffect(() => {
    if (params.get("auto") === "1" && user?.profile) void search();
  }, []);

  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">Olá, {user?.name.split(" ")[0]}</p>
        <h1>Para onde você vai hoje?</h1>
      </header>

      <div className="busca-layout">
      <div className="stack">
        {!profile ? (
          <Alert kind="warn" title="Você ainda não tem um perfil de mobilidade">
            Sem perfil não dá para saber o que pesa na sua rota (escadas, caminhada, assento).{" "}
            <Link to="/perfil">Criar meu perfil</Link>
          </Alert>
        ) : (
          <div className="profile-bar">
            <Icon name="user" size={18} />
            <span className="grow">
              <span className="small muted block">Perfil de mobilidade</span>
              <strong>{profile.label}</strong>
            </span>
            <Link to="/perfil" className="link-btn">Trocar</Link>
          </div>
        )}

        <form className="card stack" onSubmit={search}>
          <div className="od">
            <label>
              <span className="od-label"><span className="dot origin" aria-hidden /> Origem</span>
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </label>
            <label>
              <span className="od-label"><span className="dot dest" aria-hidden /> Destino</span>
              <input value={destination} onChange={(e) => setDestination(e.target.value)} />
            </label>
          </div>
          {error && <Alert kind="bad">{error}</Alert>}
          <button className="btn primary" disabled={!profile || loading}>
            <Icon name="search" size={18} />
            {loading ? "Avaliando rotas…" : "Buscar rotas acessíveis"}
          </button>
          {loading && (
            <Spinner text={waking ? "Acordando o assistente…" : "Buscando opções e calculando a nota de acessibilidade…"} />
          )}
        </form>
      </div>

      <aside className="stack">
        {profile && (
          <section className="card stack-sm">
            <h2>O que pesa no seu perfil</h2>
            <p className="muted">{profile.hint}</p>
            <ul className="check-list">
              <li><Icon name="check" size={16} /> Escadas e elevadores das estações</li>
              <li><Icon name="check" size={16} /> Distância e inclinação da caminhada</li>
              <li><Icon name="check" size={16} /> Assento e cobertura nos pontos</li>
              <li><Icon name="check" size={16} /> Relatos da comunidade ainda ativos</li>
            </ul>
          </section>
        )}
        <section className="note">
          <h2>Modo demonstração</h2>
          <p>
            As rotas candidatas são as do cenário da Júlia, grávida de 8 meses, indo de Santa Cecília ao pré-natal na UBS Centro. O app comum
            mandaria ela pela estação mais rápida, que está com o elevador quebrado. O Rota Leve reordena as opções pelo que importa para o
            perfil dela. A nota e a explicação vêm do serviço de IA.
          </p>
        </section>
      </aside>
      </div>
    </>
  );
}
