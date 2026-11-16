// Servidor de produção do front (Render Web Service).
// - Serve o build estático (dist/) com fallback de SPA.
// - Repassa /api/* para o serviço de IA, injetando X-API-Key do lado do servidor
//   (a chave nunca chega ao navegador e o backend não precisa de CORS).
// Sem dependências: só módulos nativos do Node 18+.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const API_TARGET = (process.env.API_TARGET || "http://localhost:8000").replace(/\/$/, "");
const API_KEY = process.env.SERVICE_API_KEY || "";
const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "dist");

// Só estes endpoints do serviço de IA ficam expostos pelo proxy.
const ALLOWED = new Set(["GET /health", "GET /v1/demo/routes", "POST /v1/routes/rank"]);
const MAX_BODY = 256 * 1024;
// Limites no /rank (cada chamada pode gastar crédito de LLM): por IP e global (este não dá para burlar).
const RANK_LIMIT = { max: 20, windowMs: 60_000 };
const GLOBAL_LIMIT = { max: 300, windowMs: 60_000 };
const hits = new Map();
let globalHits = [];

// IP do cliente: cabeçalhos definidos pela borda (Cloudflare/Render), não pelo cliente.
// O primeiro item do X-Forwarded-For é controlado pelo cliente, então usamos o último.
function clientIp(req) {
  const h = req.headers;
  const xff = (h["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return h["true-client-ip"] || h["cf-connecting-ip"] || xff[xff.length - 1] || req.socket.remoteAddress;
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
  ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function rateLimited(ip) {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < GLOBAL_LIMIT.windowMs);
  if (globalHits.length >= GLOBAL_LIMIT.max) return true;
  globalHits.push(now);
  const list = (hits.get(ip) || []).filter((t) => now - t < RANK_LIMIT.windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > RANK_LIMIT.max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (!list.some((t) => now - t < RANK_LIMIT.windowMs)) hits.delete(ip);
}, 60_000).unref();

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function proxy(req, res, path) {
  if (!ALLOWED.has(`${req.method} ${path}`)) return send(res, 404, { detail: "Endpoint não disponível." });
  if (path === "/v1/routes/rank" && rateLimited(clientIp(req))) {
    return send(res, 429, { detail: "Muitas buscas em pouco tempo. Aguarde um minuto." }, { "Retry-After": "60" });
  }
  try {
    const body = req.method === "POST" ? await readBody(req) : undefined;
    // 70 s: no plano free o backend "dorme" e a primeira chamada pode levar ~1 min.
    const upstream = await fetch(API_TARGET + path, {
      method: req.method,
      headers: { "Content-Type": "application/json", ...(API_KEY ? { "X-API-Key": API_KEY } : {}) },
      body,
      signal: AbortSignal.timeout(70_000),
    });
    const text = await upstream.text();
    send(res, upstream.status, text, { "Content-Type": upstream.headers.get("content-type") || "application/json" });
  } catch (err) {
    if (err.status === 413) return send(res, 413, { detail: "Requisição muito grande." });
    console.error("proxy error:", err.message);
    send(res, 502, { detail: "O serviço de IA não respondeu. Tente novamente em instantes." });
  }
}

async function serveStatic(req, res, path) {
  const safe = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, safe);
  if (!file.startsWith(DIST)) return send(res, 403, { detail: "Proibido" });
  try {
    if (!(await stat(file)).isFile()) throw new Error("dir");
  } catch {
    file = join(DIST, "index.html"); // fallback SPA (React Router)
  }
  const ext = extname(file);
  const data = await readFile(file);
  res.writeHead(200, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Cache-Control": file.includes(`${join("dist", "assets")}`) ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : data);
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/healthz") return send(res, 200, { status: "ok" });
    if (url.pathname.startsWith("/api/")) return await proxy(req, res, url.pathname.slice(4));
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { detail: "Método não permitido" });
    return await serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    send(res, 500, { detail: "Erro interno" });
  }
}).listen(PORT, () => {
  console.log(`Rota Leve front em :${PORT} -> API ${API_TARGET} (${API_KEY ? "com" : "sem"} X-API-Key)`);
});
