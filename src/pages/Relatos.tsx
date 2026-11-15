import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ReportKind } from "../api/types";
import { PLACES, REPORT_KINDS, hoursLeft, isActive, isConfirmed, placeById, placeName, reportKindLabel } from "../data/catalog";
import { RATE_LIMIT, useApp } from "../store/AppStore";
import { Alert, PageHeader } from "../components/ui";

function timeAgo(iso: string) {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return "agora há pouco";
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function Relatos() {
  const { user, reports, confirmReport } = useApp();
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const now = Date.now();
  const active = reports.filter((r) => !r.resolved && isActive(r, now));
  const expired = reports.filter((r) => r.resolved || !isActive(r, now));

  function confirm(id: string) {
    const err = confirmReport(id);
    setMsg(err ? { kind: "bad", text: err } : { kind: "ok", text: "Obrigado! Sua confirmação renova o relato por mais 72 h." });
  }

  return (
    <>
      <PageHeader title="Relatos da comunidade" subtitle="Confirme o que você viu. Relato sem confirmação expira em 72 h." />
      <div className="stack">
        <Link to="/relatos/novo" className="btn primary">📷 Novo relato</Link>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

        {active.length === 0 && <Alert kind="ok">Nenhum problema ativo relatado. 🎉</Alert>}

        <ul className="report-list">
          {active.map((r) => {
            const mine = r.authorId === user?.id;
            const already = !!user && r.confirmedBy.includes(user.id);
            return (
              <li key={r.id} className="card report">
                {r.photo && <img src={r.photo} alt={`Foto do relato: ${reportKindLabel(r.kind)}`} className="report-photo" />}
                <div className="grow stack-sm">
                  <div className="row between wrap">
                    <strong>{REPORT_KINDS.find((k) => k.id === r.kind)?.emoji} {reportKindLabel(r.kind)}</strong>
                    <span className={`chip ${isConfirmed(r) ? "bad" : "warn"}`}>
                      {isConfirmed(r) ? `Confirmado · ${r.confirmations}` : "Não confirmado"}
                    </span>
                  </div>
                  <p>{placeName(r.place_id)}</p>
                  {r.text && <p className="muted">“{r.text}”</p>}
                  <p className="small muted">Relatado {timeAgo(r.reported_at)} · expira em {hoursLeft(r, now)} h sem nova confirmação</p>
                  <button className="btn small-btn" disabled={already} onClick={() => confirm(r.id)}>
                    {mine ? "Seu relato" : already ? "✓ Você confirmou" : "👍 Ainda está assim"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {expired.length > 0 && (
          <details className="card">
            <summary>Expirados ({expired.length})</summary>
            <ul className="plain">
              {expired.map((r) => (
                <li key={r.id} className="muted small">
                  {reportKindLabel(r.kind)} · {placeName(r.place_id)} — sem confirmação há mais de {r.ttl_hours} h, ignorado na nota
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
}

async function shrinkImage(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function NovoRelato() {
  const { addReport } = useApp();
  const nav = useNavigate();
  const initialPlace = useSearchParams()[0].get("local") ?? "";
  const [placeId, setPlaceId] = useState(placeById(initialPlace) ? initialPlace : "");
  const [kind, setKind] = useState<ReportKind | "">("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const place = placeById(placeId);
  const kinds = useMemo(() => REPORT_KINDS.filter((k) => !place || k.placeTypes.includes(place.type)), [place]);

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("O arquivo precisa ser uma imagem.");
    if (f.size > 15 * 1024 * 1024) return setError("Imagem muito grande (máx. 15 MB).");
    setError(null);
    try {
      setPhoto(await shrinkImage(f));
    } catch {
      setError("Não foi possível ler esta imagem.");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!placeId) return setError("Escolha o local do problema.");
    if (!kind) return setError("Escolha o tipo de problema.");
    if (!photo) return setError("A foto é obrigatória: ela ajuda outras pessoas a confirmar o relato.");
    const err = addReport({ place_id: placeId, kind, text, photo });
    if (err) return setError(err);
    nav("/relatos");
  }

  return (
    <>
      <PageHeader title="Novo relato" subtitle="Avise a comunidade sobre um obstáculo." back={() => nav(-1)} />
      <form className="stack" onSubmit={submit} noValidate>
        <label className="card photo-input">
          {photo ? (
            <img src={photo} alt="Pré-visualização da foto" />
          ) : (
            <span className={`photo-placeholder ${touched && !photo ? "invalid" : ""}`}>📷 Tirar ou escolher foto <span className="small muted block">obrigatória</span></span>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" />
        </label>
        <p className="small muted">
          A classificação automática da foto (buraco, degrau, obstáculo) por visão computacional ainda não está exposta no serviço de IA — por
          enquanto, escolha a categoria abaixo.
        </p>

        <label>
          Local
          <select value={placeId} onChange={(e) => { setPlaceId(e.target.value); setKind(""); }}>
            <option value="">Selecione…</option>
            {PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <fieldset className="kind-grid">
          <legend>Tipo de problema</legend>
          {kinds.map((k) => (
            <label key={k.id} className={`kind-option ${kind === k.id ? "selected" : ""}`}>
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} />
              <span aria-hidden>{k.emoji}</span> {k.label}
            </label>
          ))}
        </fieldset>

        <label>
          Descrição (opcional)
          <textarea rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: elevador com tapume, sem previsão" />
          <span className="small muted">{text.length}/280</span>
        </label>

        {error && <Alert kind="bad">{error}</Alert>}
        <button className="btn primary">Enviar relato</button>
        <p className="small muted center">Para evitar spam, cada pessoa pode enviar até {RATE_LIMIT.max} relatos a cada {RATE_LIMIT.windowMin} minutos.</p>
      </form>
    </>
  );
}
