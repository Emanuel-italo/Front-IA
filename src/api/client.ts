import type { ChatMessage, ChatResponse, Health, Profile, RankResponse, Report, Route } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  /** status = HTTP; ausente quando a falha foi de rede ou timeout (kind). */
  constructor(message: string, public status?: number, public kind: "http" | "network" | "timeout" = "http") {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : init?.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ApiError("O serviço de IA demorou demais para responder.", undefined, "timeout");
    }
    throw new ApiError("Não foi possível falar com o serviço de IA. Ele está rodando?", undefined, "network");
  }
  if (!res.ok) {
    let detail = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* corpo não-JSON */
    }
    if (res.status === 502 || res.status === 504) {
      detail = "O serviço de IA não respondeu. Confira se ele está rodando na porta configurada.";
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

/** Limites do contrato do /v1/chat. */
export const CHAT_LIMITS = { maxMessages: 20, maxChars: 1000, maxRoutes: 10 };
// No plano free do Render o serviço "dorme": a primeira chamada pode levar ~1 min.
// Um pouco acima do timeout do proxy (70 s), para que o erro do proxy chegue primeiro.
const CHAT_TIMEOUT_MS = 75_000;

export const api = {
  health: () => request<Health>("/health"),
  demoRoutes: () => request<Route[]>("/v1/demo/routes"),
  rank: (profile: Profile, routes: Route[], reports: Report[], explain = true) =>
    request<RankResponse>("/v1/routes/rank", {
      method: "POST",
      body: JSON.stringify({ profile, routes, reports, explain }),
    }),
  /**
   * Envia a conversa inteira (o serviço não guarda histórico). Corta para as 20 mensagens mais recentes;
   * quem chama garante que a última é do usuário.
   */
  sendChatMessage: (profile: Profile, messages: ChatMessage[], routes?: Route[], reports?: Report[]) =>
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
      CHAT_TIMEOUT_MS,
    ),
};
