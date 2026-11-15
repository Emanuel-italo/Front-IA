import type { ReactNode } from "react";
import type { Leg, RouteLabel } from "../api/types";

export const LABELS: Record<RouteLabel, { text: string; cls: string }> = {
  recomendada: { text: "Recomendada", cls: "ok" },
  com_ressalvas: { text: "Com ressalvas", cls: "warn" },
  nao_recomendada: { text: "Não recomendada", cls: "bad" },
};

export function ScoreRing({ score, label }: { score: number; label: RouteLabel }) {
  const cls = LABELS[label].cls;
  return (
    <div className={`score-ring ${cls}`} style={{ ["--p" as string]: score }} role="img" aria-label={`Nota de acessibilidade ${score} de 100`}>
      <span>{score}</span>
    </div>
  );
}

export function LabelChip({ label }: { label: RouteLabel }) {
  const l = LABELS[label];
  return <span className={`chip ${l.cls}`}>{l.text}</span>;
}

export const MODE_INFO: Record<Leg["mode"], { icon: string; text: string }> = {
  WALK: { icon: "🚶", text: "A pé" },
  SUBWAY: { icon: "🚇", text: "Metrô" },
  TRAIN: { icon: "🚆", text: "Trem" },
  BUS: { icon: "🚌", text: "Ônibus" },
};

export function ModeStrip({ legs }: { legs: Leg[] }) {
  return (
    <div className="mode-strip" aria-label="Trechos da rota">
      {legs.map((l, i) => (
        <span key={i} className={`mode mode-${l.mode.toLowerCase()}`} title={MODE_INFO[l.mode].text}>
          <span aria-hidden>{MODE_INFO[l.mode].icon}</span>
          {l.mode === "WALK" ? `${l.distance_m} m` : l.line ?? MODE_INFO[l.mode].text}
        </span>
      ))}
    </div>
  );
}

export function Alert({ kind = "info", title, children }: { kind?: "info" | "warn" | "bad" | "ok"; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert ${kind}`} role={kind === "bad" ? "alert" : "status"}>
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      {text}
    </div>
  );
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return (
    <header className="page-header">
      {back && (
        <button className="icon-btn" onClick={back} aria-label="Voltar">
          ←
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
    </header>
  );
}
