import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profile, RankResponse, RankedRoute, Report, ReportKind, Route } from "../api/types";
import { seedReports } from "../data/catalog";

// Persistência LOCAL (localStorage) para a demo do front.
// Em produção: usuário/perfil/rotas salvas vêm da API Java e relatos/confirmações da API .NET.

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profile: Profile | null;
}

export interface SavedRoute {
  id: string;
  userId: string;
  savedAt: string;
  profile: Profile;
  route: Route;
  score: number;
  label: RankedRoute["label"];
  nickname: string;
}

export interface LocalReport extends Report {
  authorId: string | null; // null = relato da base de demonstração
  photo: string | null; // data URL reduzida
  confirmedBy: string[]; // idempotência: cada usuário confirma uma vez
  resolved?: boolean;
}

export interface LastSearch {
  origin: string;
  destination: string;
  candidates: Route[];
  result: RankResponse;
}

interface State {
  users: User[];
  sessionUserId: string | null;
  reports: LocalReport[];
  saved: SavedRoute[];
}

const KEY = "rota-leve:v1";

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage indisponível */
  }
  return {
    users: [],
    sessionUserId: null,
    reports: seedReports().map((r) => ({ ...r, authorId: null, photo: null, confirmedBy: [] })),
    saved: [],
  };
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Anti-spam no cliente (espelha o rate limiting da API .NET): até 3 relatos a cada 10 minutos.
export const RATE_LIMIT = { max: 3, windowMin: 10 };

interface Ctx {
  user: User | null;
  reports: LocalReport[];
  saved: SavedRoute[];
  lastSearch: LastSearch | null;
  setLastSearch: (s: LastSearch | null) => void;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  setProfile: (p: Profile) => void;
  addReport: (r: { place_id: string; kind: ReportKind; text: string; photo: string }) => string | null;
  confirmReport: (id: string) => string | null;
  saveRoute: (route: Route, ranked: RankedRoute, profile: Profile, nickname: string) => void;
  removeSaved: (id: string) => void;
  resetDemo: () => void;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [lastSearch, setLastSearch] = useState<LastSearch | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* cota cheia ou storage bloqueado: segue só em memória */
    }
  }, [state]);

  const user = state.users.find((u) => u.id === state.sessionUserId) ?? null;

  const register = useCallback(async (name: string, email: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (state.users.some((u) => u.email === e)) return "Já existe uma conta com este e-mail.";
    const newUser: User = { id: uid("usr"), name: name.trim(), email: e, passwordHash: await sha256(password), profile: null };
    setState((s) => ({ ...s, users: [...s.users, newUser], sessionUserId: newUser.id }));
    return null;
  }, [state.users]);

  const login = useCallback(async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    const hash = await sha256(password);
    const found = state.users.find((u) => u.email === e && u.passwordHash === hash);
    if (!found) return "E-mail ou senha incorretos.";
    setState((s) => ({ ...s, sessionUserId: found.id }));
    return null;
  }, [state.users]);

  const logout = useCallback(() => {
    setLastSearch(null);
    setState((s) => ({ ...s, sessionUserId: null }));
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setLastSearch(null);
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, profile: p } : u)) }));
  }, []);

  const addReport: Ctx["addReport"] = (r) => {
    if (!user) return "Entre na sua conta para relatar.";
    const windowStart = Date.now() - RATE_LIMIT.windowMin * 60_000;
    const recent = state.reports.filter((x) => x.authorId === user.id && new Date(x.reported_at).getTime() > windowStart);
    if (recent.length >= RATE_LIMIT.max) {
      return `Limite de ${RATE_LIMIT.max} relatos a cada ${RATE_LIMIT.windowMin} minutos atingido. Tente novamente mais tarde.`;
    }
    const now = new Date().toISOString();
    const report: LocalReport = {
      id: uid("rel"),
      place_id: r.place_id,
      kind: r.kind,
      text: r.text.trim(),
      reported_at: now,
      last_confirmed_at: now,
      confirmations: 1,
      ttl_hours: 72,
      authorId: user.id,
      photo: r.photo,
      confirmedBy: [user.id],
    };
    setLastSearch(null);
    setState((s) => ({ ...s, reports: [report, ...s.reports] }));
    return null;
  };

  const confirmReport: Ctx["confirmReport"] = (id) => {
    if (!user) return "Entre na sua conta para confirmar.";
    const r = state.reports.find((x) => x.id === id);
    if (!r) return "Relato não encontrado.";
    if (r.confirmedBy.includes(user.id)) return "Você já confirmou este relato.";
    setLastSearch(null);
    setState((s) => ({
      ...s,
      reports: s.reports.map((x) =>
        x.id === id
          ? { ...x, confirmations: x.confirmations + 1, last_confirmed_at: new Date().toISOString(), confirmedBy: [...x.confirmedBy, user.id] }
          : x,
      ),
    }));
    return null;
  };

  const saveRoute: Ctx["saveRoute"] = (route, ranked, profile, nickname) => {
    if (!user) return;
    setState((s) => ({
      ...s,
      saved: [
        { id: uid("rota"), userId: user.id, savedAt: new Date().toISOString(), profile, route, score: ranked.score, label: ranked.label, nickname },
        ...s.saved.filter((x) => !(x.userId === user.id && x.route.id === route.id && x.profile === profile)),
      ],
    }));
  };

  const removeSaved = (id: string) => setState((s) => ({ ...s, saved: s.saved.filter((x) => x.id !== id) }));

  const resetDemo = () => {
    setLastSearch(null);
    setState((s) => ({ ...s, reports: seedReports().map((r) => ({ ...r, authorId: null, photo: null, confirmedBy: [] })) }));
  };

  const value = useMemo<Ctx>(
    () => ({
      user,
      reports: state.reports,
      saved: state.saved.filter((x) => x.userId === user?.id),
      lastSearch,
      setLastSearch,
      register,
      login,
      logout,
      setProfile,
      addReport,
      confirmReport,
      saveRoute,
      removeSaved,
      resetDemo,
    }),
    [state, user, lastSearch, register, login, logout, setProfile],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fora do AppProvider");
  return ctx;
}

/** Remove campos locais antes de mandar para o serviço de IA (contrato Report). */
export const toApiReports = (reports: LocalReport[]): Report[] =>
  reports
    .filter((r) => !r.resolved)
    .map(({ id, place_id, kind, text, reported_at, last_confirmed_at, confirmations, ttl_hours }) => ({
      id, place_id, kind, text, reported_at, last_confirmed_at, confirmations, ttl_hours,
    }));

export function routePlaceIds(route: Route): Set<string> {
  const ids = new Set<string>();
  for (const l of route.legs) for (const p of [l.from_place, l.to_place, l.segment_id]) if (p) ids.add(p);
  return ids;
}
