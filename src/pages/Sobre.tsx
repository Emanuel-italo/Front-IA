import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Health } from "../api/types";
import { Alert, PageHeader } from "../components/ui";

export function Sobre() {
  const nav = useNavigate();
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setOffline(true));
  }, []);

  return (
    <>
      <PageHeader title="Sobre o Rota Leve" back={() => nav(-1)} />
      <div className="stack">
        <section className="card stack-sm">
          <p>
            O Rota Leve ajuda gestantes, pessoas com carrinho de bebê, pessoas idosas, cadeirantes e quem está com a mobilidade reduzida a escolher a
            rota de transporte público que <strong>realmente</strong> dá para fazer.
          </p>
          <p>
            O app não reinventa o roteamento: pega as opções de transporte público e reordena pelo que importa para o seu perfil — escadas, elevadores,
            caminhada, ladeiras, assento e cobertura — com uma nota de 0 a 100 e uma explicação em linguagem simples.
          </p>
          <p>A comunidade mantém os dados vivos: relatos de elevador quebrado ou calçada ruim são confirmados por outras pessoas e expiram se ninguém confirmar.</p>
        </section>

        <section className="card stack-sm">
          <h2>Objetivos de Desenvolvimento Sustentável</h2>
          <p><strong>ODS 10</strong> — Redução das desigualdades</p>
          <p><strong>ODS 11</strong> — Cidades e comunidades sustentáveis</p>
        </section>

        <section className="card stack-sm">
          <h2>Status do serviço de IA</h2>
          {offline && <Alert kind="bad">Serviço de IA indisponível.</Alert>}
          {health && (
            <ul className="plain">
              <li>Status: <strong>{health.status}</strong></li>
              <li>IA generativa: <strong>{health.ia_generativa}</strong></li>
              <li>Trechos na base de conhecimento (RAG): <strong>{health.trechos_na_base}</strong></li>
            </ul>
          )}
          {!health && !offline && <p className="muted">Verificando…</p>}
        </section>

        <Alert kind="warn" title="Aviso">
          Projeto acadêmico. Os dados de acessibilidade das estações e os relatos de exemplo são sintéticos e não refletem a situação real. A nota é
          apoio à decisão: confirme elevadores e acessos nos canais oficiais.
        </Alert>
        <p className="small muted center">Rota Leve · v1.0</p>
      </div>
    </>
  );
}
