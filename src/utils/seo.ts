import type { MetaDescriptor } from "react-router";
import { APP_NAME, SITE_DESCRIPTION, SITE_URL } from "~/config";

interface PageMetaOptions {
  /** Título da página; sem ele, o título principal do produto. */
  title?: string;
  description?: string;
  /** Caminho canônico, ex.: "/como-funciona". */
  path: string;
  /** Telas que dependem da sessão (resultado, apresentação) não devem ser indexadas. */
  indexable?: boolean;
}

const HOME_TITLE = `${APP_NAME} — sorteio de nomes online, grátis e sem cadastro`;

/** Título, descrição, link canônico, Open Graph e Twitter Card de uma página. */
export function pageMeta({
  title,
  description = SITE_DESCRIPTION,
  path,
  indexable = true,
}: PageMetaOptions): MetaDescriptor[] {
  const fullTitle = title ? `${title} · ${APP_NAME}` : HOME_TITLE;
  const url = SITE_URL ? `${SITE_URL}${path}` : null;
  const image = `${SITE_URL}/og.png`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    ...(indexable ? [] : [{ name: "robots", content: "noindex" }]),
    ...(url
      ? [
          { tagName: "link", rel: "canonical", href: url },
          { property: "og:url", content: url },
        ]
      : []),
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: APP_NAME },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: `${APP_NAME}: sorteios simples, resultados justos.` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
}
