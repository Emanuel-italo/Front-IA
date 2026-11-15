import { useMemo } from "react";
import { isActive, isConfirmed } from "../data/catalog";
import { routePlaceIds, useApp, type LocalReport, type SavedRoute } from "./AppStore";

export interface SavedAlert {
  saved: SavedRoute;
  problems: LocalReport[];
}

/**
 * Avisos para quem salvou a rota: relatos ativos em locais da rota.
 * No sistema completo isto chega por evento (RabbitMQ -> consumidor Java -> push); aqui é calculado no cliente.
 */
export function useSavedAlerts(): SavedAlert[] {
  const { saved, reports } = useApp();
  return useMemo(() => {
    const now = Date.now();
    return saved
      .map((s) => {
        const ids = routePlaceIds(s.route);
        const problems = reports.filter((r) => !r.resolved && ids.has(r.place_id) && isActive(r, now));
        // Prioriza confirmados e elevadores.
        problems.sort((a, b) => Number(isConfirmed(b)) - Number(isConfirmed(a)) || Number(b.kind === "elevador_fora") - Number(a.kind === "elevador_fora"));
        return { saved: s, problems };
      })
      .filter((a) => a.problems.length > 0);
  }, [saved, reports]);
}
