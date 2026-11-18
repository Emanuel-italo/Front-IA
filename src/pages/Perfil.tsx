import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Profile } from "../api/types";
import { PROFILES } from "../data/catalog";
import { useApp } from "../store/AppStore";
import { Alert, PageHeader } from "../components/ui";
import { Icon } from "../components/Icon";

export function Perfil() {
  const { user, setProfile, logout, resetDemo } = useApp();
  const nav = useNavigate();
  const isNew = useSearchParams()[0].get("novo") === "1";
  const [choice, setChoice] = useState<Profile | null>(user?.profile ?? null);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!choice) return;
    setProfile(choice);
    setSaved(true);
    if (isNew) nav("/", { replace: true });
  }

  return (
    <div className="narrow">
      <PageHeader title={isNew ? `Olá, ${user?.name.split(" ")[0]}!` : "Perfil de mobilidade"} subtitle="Ele define o que pesa na nota de cada rota." />
      <div className="stack">
        {isNew && <Alert kind="info">Escolha o perfil que melhor descreve como você se desloca hoje. Dá para trocar quando quiser.</Alert>}
        <fieldset className="profile-grid">
          <legend className="sr-only">Perfil de mobilidade</legend>
          {PROFILES.map((p) => (
            <label key={p.id} className={`profile-option ${choice === p.id ? "selected" : ""}`}>
              <input type="radio" name="perfil" value={p.id} checked={choice === p.id} onChange={() => { setChoice(p.id); setSaved(false); }} />
              <span className="radio-dot" aria-hidden />
              <span>
                <strong>{p.label}</strong>
                <span className="small muted block">{p.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {saved && !isNew && <Alert kind="ok">Perfil salvo. As próximas buscas usam este perfil.</Alert>}
        <button className="btn primary" disabled={!choice || (choice === user?.profile && !isNew)} onClick={save}>
          Salvar perfil
        </button>

        {!isNew && (
          <section className="card stack">
            <h2>Conta</h2>
            <p className="muted">{user?.name} · {user?.email}</p>
            <div className="row wrap">
              <Link className="btn" to="/sobre">Sobre o app</Link>
              <button className="btn" onClick={() => { if (confirm("Restaurar os relatos de demonstração? Os relatos criados serão apagados.")) resetDemo(); }}>
                Restaurar demo
              </button>
              <button className="btn danger" onClick={logout}><Icon name="logout" size={18} /> Sair</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
