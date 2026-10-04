import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

/**
 * Endereço público do site, usado em links canônicos e no Open Graph. Pode ser definido em
 * VITE_SITE_URL; na Vercel, o domínio de produção do projeto é usado automaticamente.
 */
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = (
  process.env.VITE_SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : "")
).replace(/\/+$/, "");

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  define: {
    "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl),
  },
  // O processamento de planilhas roda num Web Worker em módulo ES.
  worker: { format: "es" },
});
