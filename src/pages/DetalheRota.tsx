import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Leg, Profile, RankedRoute, Route } from "../api/types";
import { isActive, isConfirmed, placeName, profileLabel, reportKindLabel } from "../data/catalog";
import { routePlaceIds, toApiReports, useApp } from "../store/AppStore";
import { RouteMap } from "../components/RouteMap";
import { Icon } from "../components/Icon";
import { Alert, LabelChip, MODE_INFO, PageHeader, ScoreRing, Spinner } from "../components/ui";

const SOURCE_TEXT = {
  llm: "Explicação gerada por IA generativa e validada contra os dados da rota",
  template: "Explicação automática (IA generativa desativada no serviço)",
  template_fallback: "Explicação automática (a IA generativa falhou ou não passou na validação)",
};

function legText(l: Leg) {
  const slope = l.slope === "ingreme" ? " · trecho íngreme" : l.slope === "leve" ? " · inclinação leve" : "";
  if (l.mode === "WALK") {
    const where = l.to_place ? `até ${placeName(l.to_place)}` : l.from_place ? `de ${placeName(l.from_place)} até o destino` : "";
    return `Caminhar ${l.distance_m} m ${where}${slope}`;
  }
  return `${MODE_INFO[l.mode].text} ${l.line ?? ""}: ${placeName(l.from_place)} → ${placeName(l.to_place)}${l.num_stops ? ` (${l.num_stops} paradas)` : ""}`;
}

export function DetalheRota() {
  const { id } = useParams();
  const savedId = useSearchParams()[0].get("salva");
  const nav = useNavigate();
  const { user, lastSearch, saved, reports, saveRoute } = useApp();
  const savedEntry = saved.find((s) => s.id === savedId);

  const fromSearch = lastSearch?.result.routes.find((r) => r.route_id === id);
  const [ranked, setRanked] = useState<RankedRoute | null>(fromSearch ?? null);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const route: Route | undefined = lastSearch?.candidates.find((c) => c.id === id) ?? savedEntry?.route;
  const profile: Profile | null | undefined = fromSearch ? lastSearch?.result.profile : savedEntry?.profile ?? user?.profile;

  useEffect(() => {
    if (fromSearch || !route || !profile) return;
    api
      .rank(profile, [route], toApiReports(reports))
      .then((r) => setRanked(r.routes[0]))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao avaliar a rota."));
  }, [fromSearch, route, profile, reports]);

  const activeReports = useMemo(() => {
    if (!route) return [];
    const ids = routePlaceIds(route);
    return reports.filter((r) => !r.resolved && ids.has(r.place_id) && isActive(r));
  }, [route, reports]);

  if (!route) {
    return (
      <>
        <PageHeader title="Rota não encontrada" back={() => nav("/")} />
        <Alert kind="warn">Faça uma nova busca para ver os detalhes desta rota.</Alert>
      </>
    );
  }

  const isSaved = saved.some((s) => s.route.id === route.id && s.profile === profile);

  return (
    <>
      <PageHeader title={route.summary} subtitle={profile ? `Perfil: ${profileLabel(profile)}` : undefined} back={() => nav(-1)} />
      <div className="detail-layout">
        <div className="detail-map">
          <RouteMap route={route} reports={activeReports} />
        </div>
      <div className="stack">
        {error && <Alert kind="bad">{error}</Alert>}
        {!ranked && !error && <Spinner text="Recalculando a nota com os relatos mais recentes…" />}

        {ranked && (
          <section className="card stack">
            <div className="route-top">
              <ScoreRing score={ranked.score} label={ranked.label} />
              <div>
                <LabelChip label={ranked.label} />
                <p className="small muted">{ranked.duration_min} min · {ranked.walk_m} m a pé</p>
              </div>
            </div>
            {ranked.blocking && <Alert kind="bad" title="Rota bloqueada para o seu perfil">Há um trecho sem acesso adequado (ex.: só escada).</Alert>}

            {ranked.explanation ? (
              <div className="explanation">
                <p className="lead">{ranked.explanation.resumo}</p>
                {ranked.explanation.pontos_de_atencao.length > 0 && (
                  <>
                    <h3>Pontos de atenção</h3>
                    <ul>{ranked.explanation.pontos_de_atencao.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </>
                )}
                {ranked.explanation.dica && (
                  <p className="tip">
                    <Icon name="bulb" size={18} />
                    <span>{ranked.explanation.dica}</span>
                  </p>
                )}
                <p className={`source-note ${ranked.explanation.source === "llm" ? "llm" : ""}`}>
                  <Icon name={ranked.explanation.source === "llm" ? "sparkle" : "cog"} size={15} />
                  {SOURCE_TEXT[ranked.explanation.source]}
                </p>
              </div>
            ) : (
              <p className="muted small">Explicação disponível só para as 3 primeiras rotas da busca.</p>
            )}
          </section>
        )}

        <section className="card">
          <h2>Trechos</h2>
          <ol className="timeline">
            {route.legs.map((l, i) => (
              <li key={i} className={`tl-${l.mode.toLowerCase()}`}>
                <span className="tl-icon">
                  <Icon name={MODE_INFO[l.mode].icon} size={18} />
                </span>
                <div>
                  <p>{legText(l)}</p>
                  <p className="small muted">{l.duration_min} min</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {activeReports.length > 0 && (
          <section className="card stack">
            <h2>Relatos da comunidade nesta rota</h2>
            {activeReports.map((r) => (
              <Alert key={r.id} kind={isConfirmed(r) ? "bad" : "warn"} title={`${reportKindLabel(r.kind)} · ${placeName(r.place_id)}`}>
                {r.text && <>“{r.text}” · </>}
                {isConfirmed(r) ? `confirmado por ${r.confirmations} pessoas` : "ainda não confirmado"}
              </Alert>
            ))}
            <Link to="/relatos" className="small">Ver e confirmar relatos</Link>
          </section>
        )}

        {ranked && ranked.breakdown.length > 0 && (
          <details className="card">
            <summary>Como a nota foi calculada</summary>
            <table className="breakdown">
              <tbody>
                <tr><td>Nota inicial</td><td className="num">100</td></tr>
                {ranked.breakdown.map((b, i) => (
                  <tr key={i}><td>{b.detail}</td><td className="num bad-text">{b.points}</td></tr>
                ))}
                <tr className="total"><td>Nota final{ranked.blocking ? " (limitada a 25 por bloqueio)" : ""}</td><td className="num">{ranked.score}</td></tr>
              </tbody>
            </table>
          </details>
        )}

        <div className="row wrap">
          {ranked && profile && !isSaved && (
            <button className="btn primary" onClick={() => { saveRoute(route, ranked, profile, route.summary); setJustSaved(true); }}>
              <Icon name="bookmark" size={18} /> Salvar rota e receber avisos
            </button>
          )}
          {(isSaved || justSaved) && <Alert kind="ok">Rota salva. Se algum elevador dela quebrar, você verá um aviso em Minhas rotas.</Alert>}
          <Link className="btn" to={`/relatos/novo?local=${encodeURIComponent([...routePlaceIds(route)][0] ?? "")}`}>
            <Icon name="camera" size={18} /> Relatar problema
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}
