import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { RankedRoute } from "../api/types";
import { profileLabel } from "../data/catalog";
import { useApp } from "../store/AppStore";
import { Alert, LabelChip, ModeStrip, PageHeader, ScoreRing } from "../components/ui";
import { ChatPanel } from "../components/ChatPanel";
import { api } from "../api/client";
import { Icon } from "../components/Icon";

const cardId = (routeId: string) => `rota-card-${routeId}`;

export function Resultado() {
  const { lastSearch, chat } = useApp();
  const nav = useNavigate();
  const [view, setView] = useState<"leve" | "comum">("leve");
  const [chatOpen, setChatOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const chatBtnRef = useRef<HTMLButtonElement>(null);

  // Acorda o serviço de IA em segundo plano (plano free do Render dorme e leva ~40 s para subir),
  // para o chat responder rápido. Não bloqueia a tela e ignora qualquer falha.
  useEffect(() => {
    api.health().catch(() => {});
  }, []);

  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  if (!lastSearch) return <Navigate to="/" replace />;

  function closeChat() {
    setChatOpen(false);
    requestAnimationFrame(() => chatBtnRef.current?.focus());
  }

  // Chip de rota citada no chat: fecha o painel, rola até o card e o destaca.
  function showRoute(routeId: string) {
    setChatOpen(false);
    setHighlight(routeId);
    requestAnimationFrame(() => {
      const el = document.getElementById(cardId(routeId));
      if (!el) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
      el.focus({ preventScroll: true });
    });
  }

  const { result, candidates, origin, destination } = lastSearch;
  const routeOf = (id: string) => candidates.find((c) => c.id === id)!;
  const noneAccessible = result.routes.every((r) => r.label === "nao_recomendada");
  const list: RankedRoute[] =
    view === "leve" ? result.routes : [...result.routes].sort((a, b) => a.duration_min - b.duration_min);

  return (
    <>
      <PageHeader title="Rotas encontradas" subtitle={`${origin} → ${destination}`} back={() => nav("/")} />
      <div className="stack">
        <p className="small muted">Perfil: <strong>{profileLabel(result.profile)}</strong></p>

        <div className="segmented" role="tablist" aria-label="Ordenação">
          <button role="tab" aria-selected={view === "leve"} className={view === "leve" ? "on" : ""} onClick={() => setView("leve")}>
            Ordem Rota Leve
          </button>
          <button role="tab" aria-selected={view === "comum"} className={view === "comum" ? "on" : ""} onClick={() => setView("comum")}>
            Como um app comum ordenaria
          </button>
        </div>
        {view === "comum" && (
          <Alert kind="info">Ordenado só pelo tempo de viagem, sem considerar acessibilidade. Compare a primeira opção com a da ordem Rota Leve.</Alert>
        )}

        {noneAccessible && (
          <Alert kind="bad" title="Nenhuma rota acessível para o seu perfil agora">
            Todas as opções têm bloqueios ou obstáculos sérios. Considere transporte porta a porta (ex.: Atende+/táxi acessível) ou tente mais
            tarde — relatos de elevador podem ser resolvidos.
          </Alert>
        )}

        <ol className="route-list">
          {list.map((r, i) => (
            <li key={r.route_id}>
              <Link
                to={`/rota/${r.route_id}`}
                id={cardId(r.route_id)}
                className={`route-card ${r.label} ${highlight === r.route_id ? "highlight" : ""}`}
              >
                <div className="route-top">
                  <ScoreRing score={r.score} label={r.label} />
                  <div className="grow">
                    <div className="row between">
                      <span className="rank-pos">Opção {i + 1}</span>
                      <LabelChip label={r.label} />
                    </div>
                    <h3>{r.summary}</h3>
                    <p className="small muted">{r.duration_min} min · {r.walk_m} m a pé</p>
                  </div>
                  <Icon name="chevron" className="card-chevron" />
                </div>
                <ModeStrip legs={routeOf(r.route_id).legs} />
                {r.explanation && <p className="expl">{r.explanation.resumo}</p>}
                {r.blocking && (
                  <p className="block-note">
                    <Icon name="ban" size={16} /> Bloqueada para o seu perfil
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ol>

        <p className="small muted">{result.notice}</p>
      </div>

      <button ref={chatBtnRef} className="btn primary chat-open" onClick={() => setChatOpen(true)} aria-haspopup="dialog">
        <Icon name="message" size={18} /> Tirar dúvidas sobre as rotas
        {chat.length > 0 && <span className="sr-only"> (conversa em andamento)</span>}
      </button>

      {chatOpen && <ChatPanel search={lastSearch} onClose={closeChat} onShowRoute={showRoute} />}
    </>
  );
}
