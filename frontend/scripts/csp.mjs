/**
 * Gera a Content-Security-Policy do site a partir do build.
 *
 * O React Router coloca pequenos scripts embutidos no HTML (restauração de rolagem e dados de
 * hidratação). Em vez de liberar 'unsafe-inline', calculamos o SHA-256 de cada script embutido e
 * só esses ficam permitidos. Saídas:
 *   build/csp.txt    — a política em uma linha (usada pelo servidor dos testes E2E)
 *   build/csp.caddy  — trecho de configuração importado pelo Caddy em produção
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CLIENT_DIR = "build/client";

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(path);
      return entry.name.endsWith(".html") ? [path] : [];
    }),
  );
  return files.flat();
}

const hashes = new Set();
for (const file of await htmlFiles(CLIENT_DIR)) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = match[1];
    if (body.trim()) hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  }
  if (/\sstyle="/.test(html)) {
    throw new Error(`${file} tem estilo inline: a CSP (style-src 'self') o bloquearia.`);
  }
}

const policy = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(" ")}`,
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join("; ");

await writeFile("build/csp.txt", `${policy}\n`);
await writeFile("build/csp.caddy", `header Content-Security-Policy "${policy}"\n`);
console.log(`CSP gerada com ${hashes.size} scripts embutidos permitidos por hash.`);
