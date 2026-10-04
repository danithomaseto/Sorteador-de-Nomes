import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ToastProvider } from "~/components/Toast";
import { SessionProvider } from "~/features/session/SessionProvider";
import { AnnouncerProvider } from "~/lib/a11y/Announcer";
import RoundPage from "~/routes/round";

/** Renderiza com os mesmos provedores da raiz e a rota de resultado disponível. */
export function renderWithApp(ui: ReactElement, { path = "/sorteio" }: { path?: string } = {}) {
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <AnnouncerProvider>
          <ToastProvider>
            <Routes>
              <Route path={path} element={ui} />
              <Route path="/sorteio/rodadas/:number" element={<RoundPage />} />
            </Routes>
          </ToastProvider>
        </AnnouncerProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
  return { user, ...result };
}
