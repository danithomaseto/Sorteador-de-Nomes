import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParticipantsPanel } from "~/features/participants/ParticipantsPanel";
import { renderWithApp } from "~/test/render";
import { DrawActions } from "./DrawActions";
import { DrawSettingsPanel } from "./DrawSettingsPanel";

function Workspace() {
  return (
    <>
      <ParticipantsPanel />
      <DrawSettingsPanel />
      <DrawActions />
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

  it("pergunta antes de adicionar um nome que já está na lista", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "João Silva");
    await user.type(screen.getByLabelText("Nome do participante"), "joão  silva");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText(/“João Silva” já está na lista/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Participantes/ })).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Adicionar mesmo assim" }));
    expect(screen.getByRole("heading", { name: /Participantes/ })).toHaveTextContent("2");
    expect(screen.getAllByText("Possível duplicado")).toHaveLength(2);
  });

  it("explica o erro ao tentar adicionar um nome vazio", async () => {
    const { user } = renderWithApp(<Workspace />);
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Digite um nome para adicionar.")).toBeInTheDocument();
  });

  it("explica o limite de tamanho do nome", async () => {
    const { user } = renderWithApp(<Workspace />);
    await user.type(screen.getByLabelText("Nome do participante"), "x".repeat(121));
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("O nome pode ter no máximo 120 caracteres.")).toBeInTheDocument();
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
        "Não é possível sortear 3 vencedores com apenas 2 participantes disponíveis. Diminua a quantidade ou permita repetição.",
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

  it("sorteia sem usar a rede", async () => {
    const { user } = renderWithApp(<Workspace />);
    await addName(user, "Ana");
    await user.click(screen.getByRole("button", { name: "Sortear 1" }));
    expect(await screen.findByText("Parabéns!")).toBeInTheDocument();
    expect(screen.getByText("Ana", { selector: "p" })).toBeInTheDocument();
  });
});
