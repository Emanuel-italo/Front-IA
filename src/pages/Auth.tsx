import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../store/AppStore";
import { Alert } from "../components/ui";

function Brand() {
  return (
    <div className="brand">
      <img src="/icon.svg" alt="" width={56} height={56} />
      <h1>Rota Leve</h1>
      <p className="muted">Rotas de transporte público pensadas para quem não pode encarar qualquer escada.</p>
    </div>
  );
}

export function Login() {
  const { login } = useApp();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await login(email, password);
    setBusy(false);
    if (err) setError(err);
    else nav(from, { replace: true });
  }

  return (
    <div className="auth">
      <Brand />
      <form className="card stack" onSubmit={submit} noValidate>
        <h2>Entrar</h2>
        {error && <Alert kind="bad">{error}</Alert>}
        <label>
          E-mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary" disabled={busy || !email || !password}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="center">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
      <p className="center small muted"><Link to="/sobre">Sobre o app</Link></p>
    </div>
  );
}

export function Cadastro() {
  const { register } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Informe um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa de pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");
    const err = await register(name, email, password);
    if (err) setError(err);
    else nav("/perfil?novo=1", { replace: true });
  }

  return (
    <div className="auth">
      <Brand />
      <form className="card stack" onSubmit={submit} noValidate>
        <h2>Criar conta</h2>
        {error && <Alert kind="bad">{error}</Alert>}
        <label>
          Nome
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label>
          Confirmar senha
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button className="btn primary">Criar conta</button>
        <p className="center">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
