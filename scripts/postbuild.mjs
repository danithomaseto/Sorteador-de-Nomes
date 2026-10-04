/**
 * Etapa final do build (`npm run build`), executada depois do React Router.
 *
 * 1. Content-Security-Policy: o React Router coloca pequenos scripts embutidos no HTML
 *    pré-renderizado (dados de hidratação e restauração de rolagem). Em vez de liberar
 *    'unsafe-inline', calculamos o SHA-256 de cada um e só esses ficam permitidos. A política vai
 *    numa tag <meta> no início de cada página (hospedagem estática não gera cabeçalhos por
 *    build) e também em build/csp.txt, para referência e testes.
 *    `connect-src 'none'` faz o próprio navegador recusar qualquer envio de dados: nem o site
 *    consegue mandar a lista para um servidor.
 * 2. sitemap.xml e robots.txt com o endereço público, quando ele é conhecido (VITE_SITE_URL ou o
 *    domínio de produção da Vercel).
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CLIENT_DIR = "build/client";
// /sorteio fica fora: é a ferramenta, sem conteúdo próprio para buscadores (ver robots.txt).
const PUBLIC_PAGES = ["/", "/como-funciona", "/privacidade"];

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

function inlineScriptHashes(html) {
  const hashes = [];
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    const body = match[1];
    if (body.trim()) hashes.push(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  }
  return hashes;
}

const pages = await htmlFiles(CLIENT_DIR);
const contents = new Map();
const hashes = new Set();
for (const file of pages) {
  const html = await readFile(file, "utf8");
  if (/\sstyle="/.test(html)) {
    throw new Error(`${file} tem estilo inline: a CSP (style-src 'self') o bloquearia.`);
  }
  for (const hash of inlineScriptHashes(html)) hashes.add(hash);
  contents.set(file, html);
}

// frame-ancestors não vale em <meta>: vai como cabeçalho (vercel.json).
const policy = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(" ")}`,
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const metaTag = `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;
for (const [file, html] of contents) {
  if (!/<meta charSet="utf-8"\/>/i.test(html)) throw new Error(`${file} sem <meta charset>`);
  await writeFile(
    file,
    html.replace(/<meta charSet="utf-8"\/>/i, (charset) => charset + metaTag),
  );
}
await writeFile("build/csp.txt", `${policy}\n`);
console.log(
  `CSP aplicada a ${String(pages.length)} páginas (${String(hashes.size)} scripts embutidos por hash).`,
);

const siteUrl = (
  process.env.VITE_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "")
).replace(/\/+$/, "");
if (siteUrl) {
  const urls = PUBLIC_PAGES.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n");
  await writeFile(
    join(CLIENT_DIR, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  const robots = await readFile(join(CLIENT_DIR, "robots.txt"), "utf8");
  await writeFile(
    join(CLIENT_DIR, "robots.txt"),
    `${robots.trimEnd()}\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
  console.log(`sitemap.xml gerado para ${siteUrl}.`);
}
