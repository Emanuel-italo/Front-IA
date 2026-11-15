import type { Health, Profile, RankResponse, Report, Route } from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Não foi possível falar com o serviço de IA. Ele está rodando?");
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

export const api = {
  health: () => request<Health>("/health"),
  demoRoutes: () => request<Route[]>("/v1/demo/routes"),
  rank: (profile: Profile, routes: Route[], reports: Report[], explain = true) =>
    request<RankResponse>("/v1/routes/rank", {
      method: "POST",
      body: JSON.stringify({ profile, routes, reports, explain }),
    }),
};
