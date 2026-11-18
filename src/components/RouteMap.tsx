import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route } from "../api/types";
import { DESTINATION, ORIGIN, placeById, placeName } from "../data/catalog";
import type { LocalReport } from "../store/AppStore";
import { reportKindLabel } from "../data/catalog";

const COLORS: Record<string, string> = { WALK: "#64748b", SUBWAY: "#dc2626", TRAIN: "#7c3aed", BUS: "#2563eb" };

type Pt = { lat: number; lng: number };

/** Mapa da rota. Coordenadas aproximadas do cenário de demonstração (o roteamento real vem da Google Directions). */
export function RouteMap({ route, reports }: { route: Route; reports: LocalReport[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const bounds: Pt[] = [ORIGIN, DESTINATION];
    let cursor: Pt = ORIGIN;
    route.legs.forEach((leg, i) => {
      const from = placeById(leg.from_place) ?? cursor;
      const isLast = i === route.legs.length - 1;
      const to = placeById(leg.to_place) ?? (isLast ? DESTINATION : placeById(route.legs[i + 1]?.from_place) ?? DESTINATION);
      const via = leg.segment_id ? placeById(leg.segment_id) : undefined;
      const pts = [from, ...(via ? [via] : []), to].map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(pts, {
        color: COLORS[leg.mode],
        weight: leg.mode === "WALK" ? 4 : 6,
        dashArray: leg.mode === "WALK" ? "6 8" : undefined,
        opacity: 0.9,
      }).addTo(map);
      bounds.push(from, to);
      cursor = to;
    });

    const dot = (p: Pt, color: string, title: string, big = false) =>
      L.circleMarker([p.lat, p.lng], { radius: big ? 9 : 6, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 })
        .bindTooltip(title)
        .addTo(map);

    dot(ORIGIN, "#0f766e", `Origem: ${ORIGIN.name}`, true);
    dot(DESTINATION, "#111827", `Destino: ${DESTINATION.name}`, true);

    const ids = new Set<string>();
    route.legs.forEach((l) => [l.from_place, l.to_place, l.segment_id].forEach((p) => p && ids.add(p)));
    ids.forEach((id) => {
      const p = placeById(id);
      if (!p) return;
      const probs = reports.filter((r) => r.place_id === id);
      if (probs.length) {
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: "map-warn", html: "<span>!</span>", iconSize: [24, 24], iconAnchor: [12, 12] }),
        })
          .bindTooltip(`${placeName(id)}: ${probs.map((r) => reportKindLabel(r.kind)).join(", ")}`)
          .addTo(map);
      } else if (p.type !== "sidewalk") {
        dot(p, "#ffffff", p.name).setStyle({ color: "#334155" });
      }
    });

    map.fitBounds(L.latLngBounds(bounds.map((b) => [b.lat, b.lng])), { padding: [24, 24] });
    return () => {
      map.remove();
    };
  }, [route, reports]);

  return <div ref={el} className="map" role="img" aria-label={`Mapa da rota ${route.summary}`} />;
}
