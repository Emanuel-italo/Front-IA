# Rota Leve — Front-end

Front-end web (mobile-first) do **Rota Leve**, app de rotas acessíveis no transporte público para gestantes, pessoas com carrinho de bebê, pessoas idosas, cadeirantes e pessoas com mobilidade reduzida temporária.

Consome o serviço de IA [`rota-leve-ai`](../../GS%20-%20Backend/Backend-IA/rota-leve-ai) (FastAPI), que dá a nota de acessibilidade (0–100), reordena as rotas e as explica em linguagem natural (RAG + IA generativa, com template de fallback).

Stack: React 18 + TypeScript + Vite + React Router + Leaflet (mapa OpenStreetMap).

## Como rodar

1. Suba o serviço de IA (na pasta do backend):
   ```bash
   pip install -r requirements.txt
   uvicorn app.main:app --port 8000
   ```
2. Suba o front (nesta pasta):
   ```bash
   npm install
   npm run dev
   ```
3. Abra http://localhost:5173, crie uma conta e escolha o perfil de mobilidade.

Se o backend usar `SERVICE_API_KEY`, copie `.env.example` para `.env.local` e preencha a mesma chave. O proxy do Vite injeta o header `X-API-Key`, então a chave nunca vai para o navegador.

## Telas

| Tela | Rota | O que faz |
|---|---|---|
| Login / Cadastro | `/login`, `/cadastro` | Conta local (senha guardada como hash SHA-256) |
| Perfil de mobilidade | `/perfil` | Gestante, cadeirante, carrinho, idoso, mobilidade temporária |
| Busca de rota | `/` | Origem/destino → chama `GET /v1/demo/routes` + `POST /v1/routes/rank` |
| Resultado com notas | `/resultado` | Nota, classificação, explicação; alterna com "como um app comum ordenaria" (só por tempo) |
| Detalhe da rota | `/rota/:id` | Mapa, trechos, explicação da IA, relatos na rota, cálculo da nota passo a passo, salvar rota |
| Relatos | `/relatos` | Relatos ativos, confirmação ("ainda está assim"), expirados |
| Novo relato | `/relatos/novo` | Foto obrigatória, local, tipo e descrição |
| Minhas rotas | `/minhas-rotas` | Rotas salvas + avisos ("o elevador da Sé está fora, veja uma alternativa") |
| Sobre o App | `/sobre` | Propósito, ODS 10 e 11, status do serviço de IA (`GET /health`) |

## Como os dados fluem

- **Rotas candidatas**: no modo demonstração vêm de `GET /v1/demo/routes` (cenário da Júlia, Santa Cecília → UBS Centro). No sistema completo, a API Java busca na Google Directions (modo transit, com alternativas) e repassa ao serviço de IA.
- **Relatos**: ficam no navegador (localStorage), começando com os mesmos relatos de exemplo do backend. A cada busca eles vão no campo `reports` do `/v1/routes/rank`, então **um relato criado ou confirmado no app muda a nota de verdade**. Mesmas regras do backend: TTL de 72 h desde a última confirmação e "confirmado" com 2 ou mais confirmações.
- **Regras espelhadas da API .NET** (no cliente, para a demo): idempotência (cada usuário confirma um relato uma vez só) e rate limiting (3 relatos a cada 10 min).
- **Avisos de rota salva**: calculados no cliente a partir dos relatos ativos. No sistema completo chegam por evento (RabbitMQ → consumidor Java → notificação).

## Casos de teste negativos (QA)

- **Perfil vazio**: a busca fica bloqueada, com aviso e link para criar o perfil.
- **Relato sem foto**: o envio é bloqueado com mensagem de erro.
- **Nenhuma rota acessível**: aparece um alerta quando todas as opções estão "não recomendada" (ex.: perfil cadeirante + relatos confirmados de elevador quebrado e calçada ruim).
- **Confirmação duplicada**: "Você já confirmou este relato."
- **Spam**: o 4º relato em 10 min é recusado.
- **Serviço de IA fora do ar**: a mensagem de erro aparece na busca e no "Sobre".

## Limitações conhecidas

- Login, rotas salvas e relatos são locais (sem a API Java/.NET).
- A classificação da foto por visão computacional não está exposta no serviço de IA; a pessoa escolhe a categoria.
- Coordenadas do mapa são aproximadas e os dados de acessibilidade são **sintéticos**.
- O serviço de IA não habilita CORS. Em produção, sirva o front atrás de um proxy reverso no mesmo domínio ou chame a API Java/.NET (`VITE_API_URL`).
