import type { Profile, Report, ReportKind } from "../api/types";

// Espelho do data/pontos.json do backend + coordenadas APROXIMADAS para desenhar o mapa.
// Os atributos de acessibilidade são sintéticos (demonstração acadêmica).
export interface PlaceInfo {
  id: string;
  name: string;
  type: "station" | "bus_stop" | "sidewalk";
  lat: number;
  lng: number;
}

export const PLACES: PlaceInfo[] = [
  { id: "station:santa-cecilia", name: "Estação Santa Cecília", type: "station", lat: -23.5395, lng: -46.6503 },
  { id: "station:republica", name: "Estação República", type: "station", lat: -23.544, lng: -46.6427 },
  { id: "station:anhangabau", name: "Estação Anhangabaú", type: "station", lat: -23.5478, lng: -46.6395 },
  { id: "station:se", name: "Estação Sé", type: "station", lat: -23.5503, lng: -46.6331 },
  { id: "stop:palmeiras-200", name: "Ponto Rua das Palmeiras, 200", type: "bus_stop", lat: -23.5378, lng: -46.6524 },
  { id: "stop:praca-republica", name: "Ponto Praça da República", type: "bus_stop", lat: -23.5432, lng: -46.6418 },
  { id: "stop:ubs-centro", name: "Ponto UBS Centro", type: "bus_stop", lat: -23.5518, lng: -46.6362 },
  { id: "calcada:ladeira-centro", name: "Calçada da ladeira (Centro)", type: "sidewalk", lat: -23.5505, lng: -46.6372 },
];

export const ORIGIN = { name: "Santa Cecília (casa da Júlia)", lat: -23.5385, lng: -46.6512 };
export const DESTINATION = { name: "UBS Centro (pré-natal)", lat: -23.5528, lng: -46.6355 };

export const placeById = (id?: string | null) => PLACES.find((p) => p.id === id);
export const placeName = (id?: string | null) => placeById(id)?.name ?? id ?? "Local sem dados";

export const PROFILES: { id: Profile; label: string; emoji: string; hint: string }[] = [
  { id: "gestante", label: "Estou grávida", emoji: "🤰", hint: "Limita a caminhada e evita escadas e ladeiras." },
  { id: "cadeirante", label: "Uso cadeira de rodas", emoji: "♿", hint: "Exige acesso sem degraus; escada sem elevador bloqueia a rota." },
  { id: "carrinho", label: "Ando com carrinho de bebê", emoji: "👶", hint: "Exige acesso sem degraus e calçada transitável." },
  { id: "idoso", label: "Sou pessoa idosa", emoji: "🧓", hint: "Caminhada curta, prioriza assento e cobertura." },
  { id: "mobilidade_temporaria", label: "Mobilidade reduzida temporária", emoji: "🩼", hint: "Perna engessada, pós-cirurgia: o mínimo de caminhada possível." },
];

export const profileLabel = (p?: Profile | null) => PROFILES.find((x) => x.id === p)?.label ?? "Sem perfil";

export const REPORT_KINDS: { id: ReportKind; label: string; emoji: string; placeTypes: PlaceInfo["type"][] }[] = [
  { id: "elevador_fora", label: "Elevador quebrado", emoji: "🛗", placeTypes: ["station"] },
  { id: "escada_rolante_fora", label: "Escada rolante parada", emoji: "↗️", placeTypes: ["station"] },
  { id: "calcada_ruim", label: "Calçada esburacada / obstáculo", emoji: "🚧", placeTypes: ["sidewalk"] },
  { id: "sem_cobertura", label: "Ponto sem cobertura", emoji: "☔", placeTypes: ["bus_stop"] },
];

export const reportKindLabel = (k: ReportKind) => REPORT_KINDS.find((x) => x.id === k)?.label ?? k;

// Espelho do data/relatos.json do backend (horas relativas ao primeiro acesso, como no backend).
export function seedReports(now = Date.now()): Report[] {
  const h = (hours: number) => new Date(now - hours * 3600_000).toISOString();
  return [
    { id: "rel-001", place_id: "station:se", kind: "elevador_fora", text: "Elevador de acesso à plataforma parado, com tapume.", reported_at: h(30), last_confirmed_at: h(2), confirmations: 5, ttl_hours: 72 },
    { id: "rel-002", place_id: "station:anhangabau", kind: "elevador_fora", text: "Parece que o elevador não está respondendo.", reported_at: h(3), last_confirmed_at: h(3), confirmations: 1, ttl_hours: 72 },
    { id: "rel-003", place_id: "calcada:ladeira-centro", kind: "calcada_ruim", text: "Buraco grande e piso solto no meio da calçada.", reported_at: h(20), last_confirmed_at: h(20), confirmations: 1, ttl_hours: 72 },
    { id: "rel-004", place_id: "station:republica", kind: "elevador_fora", text: "Elevador em manutenção.", reported_at: h(200), last_confirmed_at: h(100), confirmations: 3, ttl_hours: 72 },
  ];
}

// Mesmas regras do backend (app/reports.py).
export const CONFIRMED_MIN = 2;
export const isActive = (r: Report, now = Date.now()) =>
  now - new Date(r.last_confirmed_at).getTime() < r.ttl_hours * 3600_000;
export const isConfirmed = (r: Report) => r.confirmations >= CONFIRMED_MIN;
export const hoursLeft = (r: Report, now = Date.now()) =>
  Math.max(0, Math.round(r.ttl_hours - (now - new Date(r.last_confirmed_at).getTime()) / 3600_000));
