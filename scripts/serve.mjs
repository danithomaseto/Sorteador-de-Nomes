/**
 * Prévia local do build de produção (`npm start`) e servidor dos testes E2E.
 *
 * Reproduz a hospedagem estática da Vercel a partir do próprio vercel.json: arquivos do build,
 * cabeçalhos de segurança e de cache, e reescrita das rotas da aplicação para o fallback da SPA.
 * Assim os testes provam que a configuração de produção não bloqueia nada. Não há API: o site é
 * só um conjunto de arquivos estáticos.
 *
 * Variáveis: PORT (4173), WEB_ROOT (build/client).
 */
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const ROOT = resolve(process.env.WEB_ROOT ?? join(projectRoot, "build/client"));
const PORT = Number(process.env.PORT ?? 4173);
const config = JSON.parse(await readFile(join(projectRoot, "vercel.json"), "utf8"));

// As regras do vercel.json usam expressões compatíveis com RegExp ("/(.*)", "/((?!assets/).*)").
const headerRules = config.headers.map((rule) => ({
  pattern: new RegExp(`^${rule.source}$`),
  headers: rule.headers,
}));
const rewrites = config.rewrites.map((rule) => ({
  pattern: new RegExp(`^${rule.source}$`),
  destination: rule.destination,
}));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Arquivo do build para o caminho pedido: o próprio arquivo, index.html da pasta ou reescrita. */
async function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // URL malformada (ex.: "/%E0")
  }
  const safe = normalize(decoded);
  for (const candidate of [join(ROOT, safe), join(ROOT, safe, "index.html")]) {
    if ((candidate === ROOT || candidate.startsWith(ROOT + sep)) && (await isFile(candidate))) {
      return candidate;
    }
  }
  const rewrite = rewrites.find((rule) => rule.pattern.test(pathname));
  return rewrite ? join(ROOT, rewrite.destination) : null;
}

function headersFor(pathname) {
  const headers = {};
  for (const rule of headerRules) {
    if (!rule.pattern.test(pathname)) continue;
    for (const { key, value } of rule.headers) headers[key] = value;
  }
  return headers;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const headers = headersFor(pathname);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const file = await resolveFile(pathname);
  if (!file || !(await isFile(file))) {
    response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Não encontrado");
    return;
  }
  response.writeHead(200, {
    ...headers,
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).pipe(response);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Prévia do build em http://127.0.0.1:${String(PORT)}`);
});
