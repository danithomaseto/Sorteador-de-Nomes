import type { Config } from "@react-router/dev/config";

/**
 * SPA sem servidor Node em produção (`ssr: false`).
 * As páginas públicas são pré-renderizadas no build para SEO e carregamento rápido;
 * as telas do sorteio rodam apenas no navegador, com o estado da sessão em memória.
 */
export default {
  appDirectory: "src",
  ssr: false,
  prerender: ["/", "/como-funciona", "/privacidade"],
} satisfies Config;
