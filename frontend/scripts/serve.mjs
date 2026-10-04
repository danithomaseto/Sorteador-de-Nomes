/**
 * Prévia local do build de produção (`npm start`) e servidor dos testes E2E.
 *
 * Reproduz o Caddy de produção (deploy/Caddyfile): arquivos estáticos do build, fallback da SPA,
 * proxy de /api e a mesma CSP e cabeçalhos de segurança. Assim os testes provam que a CSP de
 * produção não bloqueia nada. Não é um servidor de produção.
 *
 * Variáveis: PORT (4173), API_TARGET (http://127.0.0.1:8000), WEB_ROOT (build/client).
 */
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, request as forward } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(
  process.env.WEB_ROOT ?? fileURLToPath(new URL("../build/client", import.meta.url)),
);
const API = new URL(process.env.API_TARGET ?? "http://127.0.0.1:8000");
const PORT = Number(process.env.PORT ?? 4173);
const CSP = (await readFile(resolve(ROOT, "../csp.txt"), "utf8")).trim();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy":
    "fullscreen=(self), screen-wake-lock=(self), camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolvePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // URL malformada (ex.: "/%E0")
  }
  const safe = normalize(decoded);
  for (const candidate of [join(ROOT, safe), join(ROOT, safe, "index.html")]) {
    if ((candidate === ROOT || candidate.startsWith(ROOT + sep)) && (await isFile(candidate)))
      return candidate;
  }
  // Arquivos inexistentes com extensão (ex.: /assets/x.js) são 404; rotas da SPA usam o fallback.
  return extname(safe) ? null : join(ROOT, "__spa-fallback.html");
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const upstream = forward(
      {
        hostname: API.hostname,
        port: API.port,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/problem+json" });
      res.end(JSON.stringify({ status: 502, code: "bad_gateway", title: "API indisponível" }));
    });
    req.pipe(upstream);
    return;
  }
  const file = await resolvePath(url.pathname);
  if (!file) {
    res.writeHead(404, SECURITY_HEADERS);
    res.end("Não encontrado");
    return;
  }
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Prévia do build em http://127.0.0.1:${PORT} (API: ${API.origin})`);
});
