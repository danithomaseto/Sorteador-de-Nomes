/// <reference lib="webworker" />
/**
 * Web Worker de importação: lê texto e planilhas fora da thread da interface, para que listas
 * grandes não travem a página. Roda no próprio navegador; não faz nenhuma requisição de rede.
 */
import { handleImportRequest, type ImportRequest } from "./handler";

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", (event: MessageEvent<ImportRequest>) => {
  self.postMessage(handleImportRequest(event.data));
});
