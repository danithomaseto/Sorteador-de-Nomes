// Estilos globais primeiro: tokens e reset precedem o CSS dos componentes.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./styles/global.css";
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import archivoLatin from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url";
import { Spinner } from "./components/Spinner";
import { ToastProvider } from "./components/Toast";
import { SessionProvider } from "./features/session/SessionProvider";
import { AnnouncerProvider } from "./lib/a11y/Announcer";
import { APP_NAME } from "./lib/config";

export function links() {
  return [
    { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    // Pré-carrega a fonte principal (subconjunto latino) para evitar a troca visível de fonte.
    {
      rel: "preload",
      as: "font",
      type: "font/woff2",
      href: archivoLatin,
      crossOrigin: "anonymous",
    },
  ];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f6f5f1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#11110f" media="(prefers-color-scheme: dark)" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/** Provedores acima de todas as rotas: a sessão sobrevive à navegação entre telas. */
export default function App() {
  return (
    <SessionProvider>
      <AnnouncerProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AnnouncerProvider>
    </SessionProvider>
  );
}

export function HydrateFallback() {
  return (
    <div className="app-loading">
      <Spinner size={28} label={`Carregando o ${APP_NAME}`} />
    </div>
  );
}

/** Último recurso, se a própria raiz falhar. */
export function ErrorBoundary() {
  return (
    <main className="app-crash">
      <h1>Algo deu errado</h1>
      <p>Não foi possível carregar o {APP_NAME}. Recarregue a página para começar de novo.</p>
    </main>
  );
}
