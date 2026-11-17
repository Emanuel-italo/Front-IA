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

## Deploy no Render

O front roda como **Web Service Node** (não como Static Site). O [server.mjs](server.mjs) serve o build e repassa `/api/*` para o serviço de IA, injetando a `X-API-Key` no servidor. Assim a chave nunca vai para o navegador e o backend não precisa de CORS. Também libera só os 3 endpoints que o front usa e limita o `/rank` (20/min por IP, 300/min no total).

1. Faça o deploy do backend pelo `render.yaml` do repositório Backend-IA e anote a URL (ex.: `https://rota-leve-ai.onrender.com`) e a `SERVICE_API_KEY` gerada (painel > Environment).
2. Faça push deste repositório para o GitHub.
3. No Render: **New > Blueprint** > repositório `Front-IA`. Ele lê o [render.yaml](render.yaml) e pede:
   - `API_TARGET` = URL do backend (sem `/` no final)
   - `SERVICE_API_KEY` = a mesma chave do backend
4. Abra a URL do front e confira em **Sobre o App** se o status do serviço de IA aparece.

No plano free os serviços "dormem" após 15 min sem uso: a primeira busca pode levar cerca de 1 min. Antes da apresentação, abra o app e faça uma busca para "acordar" os dois serviços.

Para testar o modo produção localmente: `npm run build` e depois `API_TARGET=http://localhost:8000 SERVICE_API_KEY=... npm start` (porta 3000).

## Telas

| Tela | Rota | O que faz |
|---|---|---|
| Login / Cadastro | `/login`, `/cadastro` | Conta local (senha guardada como hash SHA-256) |
| Perfil de mobilidade | `/perfil` | Gestante, cadeirante, carrinho, idoso, mobilidade temporária |
| Busca de rota | `/` | Origem/destino → chama `GET /v1/demo/routes` + `POST /v1/routes/rank` |
| Resultado com notas | `/resultado` | Nota, classificação, explicação; alterna com "como um app comum ordenaria" (só por tempo) |
| Chat "Tirar dúvidas sobre as rotas" | painel em `/resultado` | Conversa com o assistente (`POST /v1/chat`) sobre as rotas da tela; chips das rotas citadas levam ao card |
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

## Chat com o assistente

- Envia sempre o mesmo `profile`, `routes` e `reports` usados no `/v1/routes/rank` da busca atual, mais a conversa inteira (no máximo 20 mensagens; o servidor não guarda histórico).
- A conversa fica **só em memória** (nunca no localStorage, porque pode ter dados de saúde) e zera quando a busca muda.
- Pergunta que falhou fica marcada como "Não enviada" e sai do histórico, com o botão "Tentar de novo".
- Passa pelo mesmo proxy do rank (`/api`), com limite de 20 mensagens por minuto por IP no `server.mjs`.
- Selos: "✨ Resposta gerada por IA" (`source: llm`) ou "⚙️ Resposta automática" (`template`/`template_fallback`). As rotas citadas e a detecção de assunto fora do tema só vêm com a IA generativa ligada no backend (`LLM_API_KEY` e `LLM_MODEL`).

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
