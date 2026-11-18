import type { ChatMessage, ChatResponse, Health, Profile, RankResponse, Report, Route } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  /** status = HTTP; ausente quando a falha foi de rede ou timeout (kind). */
  constructor(message: string, public status?: number, public kind: "http" | "network" | "timeout" = "http") {
    super(message);
  }
}

/** Opções para chamadas que podem pegar o serviço de IA "dormindo" (plano free do Render). */
export interface WakeOptions {
  /** Chamado quando a 1ª tentativa voltou 502/504 e vamos tentar de novo (mostrar "Acordando o assistente…"). */
  onWaking?: () => void;
}

interface RequestOptions extends WakeOptions {
  timeoutMs?: number;
  /** 502/504 => espera WAKE_RETRY_DELAY_MS e tenta de novo UMA vez. */
  retryOnWake?: boolean;
}

const WAKE_RETRY_DELAY_MS = 5_000;
const WAKE_STATUSES = new Set([502, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init?: RequestInit, opts: RequestOptions = {}): Promise<T> {
  // Cada tentativa tem o seu próprio timeout (o AbortSignal não pode ser reaproveitado).
  const attempt = async (): Promise<Response> => {
    try {
      return await fetch(`${BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
        signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : init?.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new ApiError("O serviço de IA demorou demais para responder.", undefined, "timeout");
      }
      throw new ApiError("Não foi possível falar com o serviço de IA. Ele está rodando?", undefined, "network");
    }
  };

  let res = await attempt();
  if (opts.retryOnWake && WAKE_STATUSES.has(res.status)) {
    opts.onWaking?.();
    await sleep(WAKE_RETRY_DELAY_MS);
    res = await attempt();
  }

  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* corpo não-JSON */
    }
    if (WAKE_STATUSES.has(res.status)) {
      detail = "O serviço de IA não respondeu. Confira se ele está rodando na porta configurada.";
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

/** Limites do contrato do /v1/chat. */
export const CHAT_LIMITS = { maxMessages: 20, maxChars: 1000, maxRoutes: 10 };
// No plano free do Render o serviço "dorme": a primeira chamada pode levar ~1 min.
// Um pouco ACIMA do timeout do proxy (70 s, em server.mjs), para que o 504 do proxy chegue antes
// do navegador desistir — é esse 504 que dispara a nova tentativa.
const CHAT_TIMEOUT_MS = 75_000;

export const api = {
  health: () => request<Health>("/health"),
  demoRoutes: (opts: WakeOptions = {}) => request<Route[]>("/v1/demo/routes", undefined, { ...opts, retryOnWake: true }),
  rank: (profile: Profile, routes: Route[], reports: Report[], explain = true, opts: WakeOptions = {}) =>
    request<RankResponse>(
      "/v1/routes/rank",
      {
        method: "POST",
        body: JSON.stringify({ profile, routes, reports, explain }),
      },
      { ...opts, retryOnWake: true },
    ),
  /**
   * Envia a conversa inteira (o serviço não guarda histórico). Corta para as 20 mensagens mais recentes;
   * quem chama garante que a última é do usuário.
   */
  sendChatMessage: (profile: Profile, messages: ChatMessage[], routes?: Route[], reports?: Report[], opts: WakeOptions = {}) =>
    request<ChatResponse>(
      "/v1/chat",
      {
        method: "POST",
        body: JSON.stringify({
          profile,
          messages: messages.slice(-CHAT_LIMITS.maxMessages),
          ...(routes?.length ? { routes: routes.slice(0, CHAT_LIMITS.maxRoutes) } : {}),
          ...(reports ? { reports } : {}),
        }),
      },
      { ...opts, timeoutMs: CHAT_TIMEOUT_MS, retryOnWake: true },
    ),
};
