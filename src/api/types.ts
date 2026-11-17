// Espelho dos contratos Pydantic do serviço de IA (app/models.py).

export type Profile = "gestante" | "cadeirante" | "carrinho" | "idoso" | "mobilidade_temporaria";

export type LegMode = "WALK" | "SUBWAY" | "TRAIN" | "BUS";

export interface Leg {
  mode: LegMode;
  distance_m: number;
  duration_min: number;
  from_place?: string | null;
  to_place?: string | null;
  segment_id?: string | null;
  slope?: "plana" | "leve" | "ingreme";
  line?: string | null;
  num_stops?: number | null;
}

export interface Route {
  id: string;
  summary: string;
  duration_min: number;
  legs: Leg[];
}

export type ReportKind = "elevador_fora" | "escada_rolante_fora" | "calcada_ruim" | "sem_cobertura";

export interface Report {
  id: string;
  place_id: string;
  kind: ReportKind;
  text: string;
  reported_at: string; // ISO
  last_confirmed_at: string; // ISO
  confirmations: number;
  ttl_hours: number;
}

export interface ScoreItem {
  code: string;
  points: number;
  detail: string;
}

export interface Explanation {
  resumo: string;
  pontos_de_atencao: string[];
  dica: string | null;
  source: "llm" | "template" | "template_fallback";
  fallback_reason: string | null;
  kb_refs: string[];
}

export type RouteLabel = "recomendada" | "com_ressalvas" | "nao_recomendada";

export interface RankedRoute {
  route_id: string;
  summary: string;
  score: number;
  label: RouteLabel;
  blocking: boolean;
  duration_min: number;
  walk_m: number;
  breakdown: ScoreItem[];
  explanation: Explanation | null;
}

export interface RankResponse {
  profile: Profile;
  routes: RankedRoute[];
  generated_at: string;
  notice: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  source: "llm" | "template" | "template_fallback";
  fallback_reason: string | null;
  out_of_scope: boolean;
  routes_cited: string[];
  kb_refs: string[];
  notice: string;
}

export interface Health {
  status: string;
  ia_generativa: string;
  trechos_na_base: number;
}
