import type { ReactNode } from "react";
import type { Leg, RouteLabel } from "../api/types";
import { Icon, type IconName } from "./Icon";

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

export const MODE_INFO: Record<Leg["mode"], { icon: IconName; text: string }> = {
  WALK: { icon: "walk", text: "A pé" },
  SUBWAY: { icon: "train", text: "Metrô" },
  TRAIN: { icon: "train", text: "Trem" },
  BUS: { icon: "bus", text: "Ônibus" },
};

export function ModeStrip({ legs }: { legs: Leg[] }) {
  return (
    <div className="mode-strip" aria-label="Trechos da rota">
      {legs.map((l, i) => (
        <span key={i} className="mode-item">
          {i > 0 && <Icon name="chevron" size={14} className="mode-sep" />}
          <span className={`mode mode-${l.mode.toLowerCase()}`}>
            <Icon name={MODE_INFO[l.mode].icon} size={15} />
            <span className="sr-only">{MODE_INFO[l.mode].text}</span>
            {l.mode === "WALK" ? `${l.distance_m} m` : l.line ?? MODE_INFO[l.mode].text}
          </span>
        </span>
      ))}
    </div>
  );
}

const ALERT_ICON: Record<"info" | "warn" | "bad" | "ok", IconName> = { info: "info", warn: "alert", bad: "alert", ok: "check" };

export function Alert({ kind = "info", title, children }: { kind?: "info" | "warn" | "bad" | "ok"; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert ${kind}`} role={kind === "bad" ? "alert" : "status"}>
      <Icon name={ALERT_ICON[kind]} size={18} className="alert-icon" />
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
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
          <Icon name="back" />
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
    </header>
  );
}
