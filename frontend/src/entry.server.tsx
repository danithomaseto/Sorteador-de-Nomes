import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";

/**
 * Usado apenas no build, para pré-renderizar as páginas públicas (`ssr: false`).
 * Em produção não existe servidor Node: o HTML gerado é servido como arquivo estático.
 * Sempre aguardamos o conteúdo completo, pois o resultado é gravado em arquivo.
 */
const renderTimeoutMs = 10_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  let status = responseStatusCode;
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: AbortSignal.timeout(renderTimeoutMs),
      onError(error: unknown) {
        status = 500;
        console.error(error);
      },
    },
  );
  await body.allReady;

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, { headers: responseHeaders, status });
}
