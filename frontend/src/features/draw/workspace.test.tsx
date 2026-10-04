import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ParticipantsPanel } from "~/features/participants/ParticipantsPanel";
import { server } from "~/test/server";
import { renderWithApp } from "~/test/render";
import { DrawSettingsPanel } from "./DrawSettingsPanel";

function Workspace() {
  return (
    <>
      <ParticipantsPanel />
      <DrawSettingsPanel />
    </>
  );
}

async function addName(user: ReturnType<typeof renderWithApp>["user"], name: string) {
  await user.clear(screen.getByLabelText("Nome do participante"));
  await user.type(screen.getByLabelText("Nome do participante"), name);
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
  await waitFor(() => {
    expect(screen.getByLabelText("Nome do participante")).toHaveValue("");
  });
}

describe("área do sorteio", () => {
  it("adiciona participantes com o nome normalizado pelo servidor", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "  Maria    Souza ");
    expect(screen.getByRole("heading", { name: /Participantes/ })).toHaveTextContent("1");
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
  });

  it("avisa quando o nome já está na lista, sem remover", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "João Silva");
    await addName(user, "joão silva");
    expect(screen.getByText(/já estava na lista\. Os dois foram mantidos/)).toBeInTheDocument();
    expect(screen.getAllByText("Possível duplicado")).toHaveLength(2);
  });

  it("explica o erro ao tentar adicionar um nome vazio", async () => {
    const { user } = renderWithApp(<Workspace />);
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Digite um nome para adicionar.")).toBeInTheDocument();
  });

  it("mostra mensagem amigável quando o servidor falha", async () => {
    server.use(http.post("*/api/v1/imports/text", () => HttpResponse.json({}, { status: 500 })));
    const { user } = renderWithApp(<Workspace />);
    await user.type(screen.getByLabelText("Nome do participante"), "Ana");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByText(/Algo deu errado do nosso lado/)).toBeInTheDocument();
  });

  it("exclui e desfaz a exclusão", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "Ana");
    await addName(user, "Bia");
    await user.click(screen.getByRole("button", { name: "Excluir Ana" }));
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("bloqueia quantidade maior que a lista e libera com repetição", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "Ana");
    await addName(user, "Bia");
    await user.click(screen.getByRole("radio", { name: "3" }));
    expect(
      screen.getByText(
        "Há apenas 2 participantes disponíveis. Diminua a quantidade ou permita repetição.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sortear 3" })).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: "Permitir repetir na mesma rodada" }));
    expect(screen.getByRole("button", { name: "Sortear 3" })).toBeEnabled();
  });

  it("sorteia e mostra o resultado com os metadados", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "Ana");
    await addName(user, "Bia");
    await addName(user, "Caio");
    await user.click(screen.getByRole("radio", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "Sortear 3" }));
    const heading = await screen.findByRole("heading", { name: "Resultado · Rodada 1" });
    expect(heading).toBeInTheDocument();
    const article = screen.getByRole("article");
    await waitFor(() => {
      expect(within(article).getAllByRole("listitem")).toHaveLength(3);
    });
    expect(within(article).getByText("Disponíveis depois")).toBeInTheDocument();
  });

  it("explica que nada foi registrado quando o sorteio falha", async () => {
    server.use(http.post("*/api/v1/rounds", () => HttpResponse.error()));
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "Ana");
    await user.click(screen.getByRole("button", { name: "Sortear 1" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sem conexão com o servidor");
    expect(alert).toHaveTextContent("Nenhum resultado foi registrado.");
  });
});
