import { Link } from "react-router-dom";
import { isConfirmed, placeName, profileLabel, reportKindLabel } from "../data/catalog";
import { useApp } from "../store/AppStore";
import { useSavedAlerts } from "../store/alerts";
import { Alert, LabelChip, ModeStrip, PageHeader } from "../components/ui";

export function MinhasRotas() {
  const { saved, removeSaved } = useApp();
  const alerts = useSavedAlerts();

  return (
    <>
      <PageHeader title="Minhas rotas" subtitle="Você recebe um aviso quando algo muda em uma rota salva." />
      <div className="stack">
        {alerts.map((a) =>
          a.problems.map((p) => (
            <Alert key={`${a.saved.id}-${p.id}`} kind={isConfirmed(p) ? "bad" : "warn"} title={`⚠️ ${reportKindLabel(p.kind)}: ${placeName(p.place_id)}`}>
              Afeta sua rota “{a.saved.nickname}”{isConfirmed(p) ? "" : " (relato ainda não confirmado)"}.{" "}
              <Link to="/?auto=1">Veja uma alternativa</Link>
            </Alert>
          )),
        )}

        {saved.length === 0 ? (
          <div className="card center stack">
            <p className="muted">Você ainda não salvou nenhuma rota.</p>
            <Link to="/" className="btn primary">Buscar uma rota</Link>
          </div>
        ) : (
          <ul className="route-list">
            {saved.map((s) => (
              <li key={s.id} className="card stack-sm">
                <div className="row between wrap">
                  <h3>{s.nickname}</h3>
                  <LabelChip label={s.label} />
                </div>
                <p className="small muted">
                  {profileLabel(s.profile)} · nota {s.score} ao salvar · {new Date(s.savedAt).toLocaleDateString("pt-BR")}
                </p>
                <ModeStrip legs={s.route.legs} />
                <div className="row wrap">
                  <Link className="btn small-btn" to={`/rota/${s.route.id}?salva=${s.id}`}>Ver nota atual</Link>
                  <button className="btn small-btn danger" onClick={() => removeSaved(s.id)}>Remover</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
