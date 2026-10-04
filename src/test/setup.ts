import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// O app não usa a rede: qualquer tentativa de requisição reprova o teste.
globalThis.fetch = () => {
  throw new Error("Requisição de rede inesperada: nenhum dado deve sair do navegador.");
};

// O jsdom não implementa <dialog> modal: comportamento mínimo para os testes.
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// Testes rodam com "reduzir movimento": a animação do sorteio termina imediatamente.
window.matchMedia = (query: string) =>
  ({
    matches: query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

// O jsdom não calcula layout (todo elemento mede 0 px) e a lista virtualizada não mostraria
// nenhuma linha. Aqui a área de rolagem tem tamanho de tela e cada linha medida (data-index), a
// altura de uma linha real.
Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { configurable: true, get: () => 640 },
  offsetHeight: {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.index === undefined ? 480 : 52;
    },
  },
});

// A lista virtualizada usa ResizeObserver, ausente no jsdom.
globalThis.ResizeObserver = class {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
};
