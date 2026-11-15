import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { DESTINATION, ORIGIN, PROFILES } from "../data/catalog";
import { toApiReports, useApp } from "../store/AppStore";
import { Alert, Spinner } from "../components/ui";

export function Busca() {
  const { user, reports, setLastSearch } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [origin, setOrigin] = useState(ORIGIN.name);
  const [destination, setDestination] = useState(DESTINATION.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = PROFILES.find((p) => p.id === user?.profile);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (!user?.profile) return;
    if (!origin.trim() || !destination.trim()) return setError("Informe origem e destino.");
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) return setError("Origem e destino são iguais.");
    setError(null);
    setLoading(true);
    try {
      // Rotas candidatas: no sistema completo vêm da Google Directions (modo transit, alternativas) via API Java.
      // Aqui usamos o cenário de demonstração do próprio serviço de IA.
      const candidates = await api.demoRoutes();
      const result = await api.rank(user.profile, candidates, toApiReports(reports));
      setLastSearch({ origin, destination, candidates, result });
      nav("/resultado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado ao buscar rotas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.get("auto") === "1" && user?.profile) void search();
  }, []);

  return (
    <>
      <header className="hero">
        <p className="small">Olá, {user?.name.split(" ")[0]}</p>
        <h1>Para onde você vai hoje?</h1>
      </header>

      <div className="stack">
        {!profile ? (
          <Alert kind="warn" title="Você ainda não tem um perfil de mobilidade">
            Sem perfil não dá para saber o que pesa na sua rota (escadas, caminhada, assento).{" "}
            <Link to="/perfil">Criar meu perfil</Link>
          </Alert>
        ) : (
          <Link to="/perfil" className="profile-pill" aria-label={`Perfil atual: ${profile.label}. Trocar perfil`}>
            <span aria-hidden>{profile.emoji}</span> {profile.label} <span className="muted small">· trocar</span>
          </Link>
        )}

        <form className="card stack" onSubmit={search}>
          <label>
            <span><span className="dot origin" aria-hidden /> Origem</span>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </label>
          <label>
            <span><span className="dot dest" aria-hidden /> Destino</span>
            <input value={destination} onChange={(e) => setDestination(e.target.value)} />
          </label>
          {error && <Alert kind="bad">{error}</Alert>}
          <button className="btn primary" disabled={!profile || loading}>
            {loading ? "Avaliando rotas…" : "Buscar rotas acessíveis"}
          </button>
          {loading && <Spinner text="Buscando opções e calculando a nota de acessibilidade…" />}
          <p className="small muted">
            Modo demonstração: as rotas candidatas são as do cenário da Júlia (Santa Cecília → UBS Centro). A nota e a explicação vêm do serviço de IA.
          </p>
        </form>

        <section className="card scene">
          <h2>A cena</h2>
          <p>
            A Júlia está grávida de 8 meses e precisa ir ao pré-natal. O app comum manda ela pela estação mais rápida — a que está com o elevador
            quebrado. O Rota Leve reordena as opções pelo que importa para o perfil dela.
          </p>
        </section>
      </div>
    </>
  );
}
